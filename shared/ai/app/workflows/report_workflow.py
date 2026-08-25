import json
from statistics import mean
from typing import TypedDict

from langgraph.graph import END, START, StateGraph

from app.models.report import GeneratedReport, ReportGenerationRequest
from app.services.text_generator import TextGenerator


class ReportState(TypedDict, total=False):
    request: ReportGenerationRequest
    symptom_summary: str
    side_effect_summary: str
    lifestyle_summary: str
    adherence_rate: float
    adherence_summary: str
    merged_context: str
    doctor_note: str
    result: GeneratedReport


class ReportWorkflow:
    def __init__(self, text_generator: TextGenerator) -> None:
        self.text_generator = text_generator
        self.graph = self._build_graph()

    def _build_graph(self):
        builder = StateGraph(ReportState)
        builder.add_node("symptom_trend", self._analyze_symptom_trend)
        builder.add_node("side_effect", self._analyze_side_effects)
        builder.add_node("lifestyle", self._analyze_lifestyle)
        builder.add_node("adherence", self._calculate_adherence)
        builder.add_node("merge", self._merge_results)
        builder.add_node("doctor_note", self._generate_doctor_note)
        builder.add_node("compile", self._compile_report)

        builder.add_edge(START, "symptom_trend")
        builder.add_edge(START, "side_effect")
        builder.add_edge(START, "lifestyle")
        builder.add_edge(START, "adherence")
        builder.add_edge(
            [
                "symptom_trend",
                "side_effect",
                "lifestyle",
                "adherence",
            ],
            "merge",
        )
        builder.add_edge("merge", "doctor_note")
        builder.add_edge("doctor_note", "compile")
        builder.add_edge("compile", END)

        return builder.compile()

    async def run(self, request: ReportGenerationRequest) -> GeneratedReport:
        final_state = await self.graph.ainvoke({"request": request})
        return final_state["result"]

    async def _analyze_symptom_trend(
        self,
        state: ReportState,
    ) -> dict[str, str]:
        request = state["request"]
        severities = []

        for health_log in request.health_logs:
            if health_log.symptom_severity is not None:
                severities.append(health_log.symptom_severity)

        if not severities:
            fallback = "증상 심각도 기록이 없습니다."
        elif len(severities) == 1:
            fallback = f"기록된 증상 심각도는 {severities[0]}점입니다."
        else:
            initial_severity = severities[0]
            final_severity = severities[-1]
            change = final_severity - initial_severity

            if change < 0:
                direction = "호전"
            elif change > 0:
                direction = "악화"
            else:
                direction = "변화 없음"

            fallback = (
                f"증상 심각도가 {initial_severity}점에서 "
                f"{final_severity}점으로 변해 {direction} 추세입니다."
            )

        context = self._to_context(request)
        summary = await self.text_generator.generate(
            instruction="날짜별 증상 심각도와 체온 변화를 간결하게 요약하세요.",
            context=context,
            fallback=fallback,
        )
        return {"symptom_summary": summary}

    async def _analyze_side_effects(
        self,
        state: ReportState,
    ) -> dict[str, str]:
        request = state["request"]
        side_effects = []

        for health_log in request.health_logs:
            if health_log.side_effects:
                side_effects.append(health_log.side_effects.strip())

        unique_side_effects = list(dict.fromkeys(side_effects))

        if unique_side_effects:
            fallback = "기록된 부작용: " + ", ".join(unique_side_effects)
        else:
            fallback = "기록된 부작용이 없습니다."

        context = self._to_context(request)
        summary = await self.text_generator.generate(
            instruction="부작용의 종류와 기록 빈도를 요약하세요.",
            context=context,
            fallback=fallback,
        )
        return {"side_effect_summary": summary}

    async def _analyze_lifestyle(
        self,
        state: ReportState,
    ) -> dict[str, str]:
        request = state["request"]
        sleep_values = []
        water_values = []
        activity_values = []

        for health_log in request.health_logs:
            if health_log.sleep_hours is not None:
                sleep_values.append(health_log.sleep_hours)

            if health_log.water_intake_ml is not None:
                water_values.append(health_log.water_intake_ml)

            if health_log.activity_minutes is not None:
                activity_values.append(health_log.activity_minutes)

        summary_parts = []

        if sleep_values:
            average_sleep = round(mean(sleep_values), 1)
            summary_parts.append(f"평균 수면 {average_sleep}시간")

        if water_values:
            average_water = round(mean(water_values))
            summary_parts.append(f"평균 음수량 {average_water}ml")

        if activity_values:
            average_activity = round(mean(activity_values))
            summary_parts.append(f"평균 활동 {average_activity}분")

        if summary_parts:
            fallback = ", ".join(summary_parts) + "으로 기록되었습니다."
        else:
            fallback = "생활 습관 기록이 없습니다."

        context = self._to_context(request)
        summary = await self.text_generator.generate(
            instruction="수면, 수분 섭취, 활동 기록의 추세를 요약하세요.",
            context=context,
            fallback=fallback,
        )
        return {"lifestyle_summary": summary}

    async def _calculate_adherence(
        self,
        state: ReportState,
    ) -> dict[str, str | float]:
        request = state["request"]
        completed_doses = []

        for dose in request.doses:
            if dose.dose_status != "PENDING":
                completed_doses.append(dose)

        taken_count = 0

        for dose in completed_doses:
            if dose.dose_status == "TAKEN":
                taken_count += 1

        if completed_doses:
            adherence_rate = round(
                taken_count / len(completed_doses) * 100,
                1,
            )
        else:
            adherence_rate = 0.0

        summary = (
            f"완료된 복약 일정 {len(completed_doses)}건 중 "
            f"{taken_count}건을 복용해 복약률은 {adherence_rate}%입니다."
        )
        return {
            "adherence_rate": adherence_rate,
            "adherence_summary": summary,
        }

    async def _merge_results(self, state: ReportState) -> dict[str, str]:
        merged_context = "\n".join(
            [
                state["symptom_summary"],
                state["side_effect_summary"],
                state["lifestyle_summary"],
                state["adherence_summary"],
            ]
        )
        return {"merged_context": merged_context}

    async def _generate_doctor_note(
        self,
        state: ReportState,
    ) -> dict[str, str]:
        fallback = (
            "증상 변화와 부작용 기록을 확인하고, "
            f"복약률 {state['adherence_rate']}%를 함께 참고해 주세요."
        )
        doctor_note = await self.text_generator.generate(
            instruction="의료진이 빠르게 참고할 수 있는 핵심 메모를 작성하세요.",
            context=state["merged_context"],
            fallback=fallback,
        )
        return {"doctor_note": doctor_note}

    async def _compile_report(
        self,
        state: ReportState,
    ) -> dict[str, GeneratedReport]:
        request = state["request"]
        report = GeneratedReport(
            summary=(
                f"{request.visit.hospital_name} 치료 기록을 분석했습니다. "
                f"복약률은 {state['adherence_rate']}%입니다."
            ),
            symptom_changes=state["symptom_summary"],
            suspected_side_effects=state["side_effect_summary"],
            lifestyle_summary=state["lifestyle_summary"],
            adherence_rate=state["adherence_rate"],
            doctor_notes=state["doctor_note"],
        )
        return {"result": report}

    def _to_context(self, request: ReportGenerationRequest) -> str:
        data = request.model_dump(mode="json", by_alias=True)
        return json.dumps(data, ensure_ascii=False)
