import json
from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph

from app.models.comparison import (
    TreatmentComparisonRequest,
    TreatmentComparisonResult,
    TreatmentSnapshot,
)
from app.services.text_generator import TextGenerator


class ComparisonState(TypedDict, total=False):
    request: TreatmentComparisonRequest
    current: TreatmentSnapshot
    past: TreatmentSnapshot
    aligned: dict[str, Any]
    common_points: list[str]
    differences: list[str]
    result: TreatmentComparisonResult


class ComparisonWorkflow:
    def __init__(self, text_generator: TextGenerator) -> None:
        self.text_generator = text_generator
        self.graph = self._build_graph()

    def _build_graph(self):
        builder = StateGraph(ComparisonState)
        builder.add_node("fetch_current", self._fetch_current)
        builder.add_node("fetch_past", self._fetch_past)
        builder.add_node("align", self._align_treatments)
        builder.add_node("diff", self._analyze_differences)
        builder.add_node("summarize", self._summarize)

        builder.add_edge(START, "fetch_current")
        builder.add_edge(START, "fetch_past")
        builder.add_edge(["fetch_current", "fetch_past"], "align")
        builder.add_edge("align", "diff")
        builder.add_edge("diff", "summarize")
        builder.add_edge("summarize", END)

        return builder.compile()

    async def run(
        self,
        request: TreatmentComparisonRequest,
    ) -> TreatmentComparisonResult:
        final_state = await self.graph.ainvoke({"request": request})
        return final_state["result"]

    async def _fetch_current(
        self,
        state: ComparisonState,
    ) -> dict[str, TreatmentSnapshot]:
        return {"current": state["request"].current}

    async def _fetch_past(
        self,
        state: ComparisonState,
    ) -> dict[str, TreatmentSnapshot]:
        return {"past": state["request"].past}

    async def _align_treatments(
        self,
        state: ComparisonState,
    ) -> dict[str, dict[str, Any]]:
        current = state["current"]
        past = state["past"]
        aligned = {
            "current": self._normalize_treatment(current),
            "past": self._normalize_treatment(past),
        }
        return {"aligned": aligned}

    async def _analyze_differences(
        self,
        state: ComparisonState,
    ) -> dict[str, list[str]]:
        current = state["current"]
        past = state["past"]
        current_medications = set(current.medication_names)
        past_medications = set(past.medication_names)
        shared_medications = sorted(current_medications & past_medications)
        current_only = sorted(current_medications - past_medications)
        past_only = sorted(past_medications - current_medications)

        if shared_medications:
            common_points = ["공통 약: " + ", ".join(shared_medications)]
        else:
            common_points = ["공통으로 처방된 약이 없습니다."]

        difference_parts = []

        if current_only:
            difference_parts.append("현재 치료에만 있는 약: " + ", ".join(current_only))

        if past_only:
            difference_parts.append("과거 치료에만 있는 약: " + ", ".join(past_only))

        current_change = self._severity_change(current)
        past_change = self._severity_change(past)

        if current_change is not None and past_change is not None:
            difference_parts.append(
                f"증상 점수 변화는 현재 {current_change}, 과거 {past_change}입니다."
            )

        if difference_parts:
            fallback = " ".join(difference_parts)
        else:
            fallback = "두 치료의 주요 차이가 기록되지 않았습니다."

        context = json.dumps(state["aligned"], ensure_ascii=False)
        differences = await self.text_generator.generate(
            instruction="두 치료의 처방 약, 기간, 증상 변화를 비교하세요.",
            context=context,
            fallback=fallback,
        )
        return {
            "common_points": common_points,
            "differences": [differences],
        }

    async def _summarize(
        self,
        state: ComparisonState,
    ) -> dict[str, TreatmentComparisonResult]:
        fallback = (
            " ".join(state["common_points"] + state["differences"])
        )
        context = json.dumps(state["aligned"], ensure_ascii=False)
        summary = await self.text_generator.generate(
            instruction="현재와 과거 치료 비교 결과를 한 문단으로 요약하세요.",
            context=context,
            fallback=fallback,
        )
        result = TreatmentComparisonResult(
            common_points=state["common_points"],
            differences=state["differences"],
            summary=summary,
        )
        return {"result": result}

    def _normalize_treatment(
        self,
        treatment: TreatmentSnapshot,
    ) -> dict[str, Any]:
        duration_days = None

        if treatment.medication_start_date and treatment.medication_end_date:
            duration = treatment.medication_end_date - treatment.medication_start_date
            duration_days = duration.days + 1

        return {
            "visitId": treatment.visit_id,
            "hospitalName": treatment.hospital_name,
            "medicationNames": treatment.medication_names,
            "durationDays": duration_days,
            "initialSeverity": treatment.initial_severity,
            "finalSeverity": treatment.final_severity,
            "severityChange": self._severity_change(treatment),
            "finalStatus": treatment.final_status,
        }

    def _severity_change(self, treatment: TreatmentSnapshot) -> int | None:
        if treatment.initial_severity is None:
            return None

        if treatment.final_severity is None:
            return None

        return treatment.final_severity - treatment.initial_severity
