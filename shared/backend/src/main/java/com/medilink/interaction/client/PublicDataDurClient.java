package com.medilink.interaction.client;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
@ConditionalOnProperty(name = "dur.enabled", havingValue = "true")
public class PublicDataDurClient implements DurClient {

    private static final String SOURCE = "식품의약품안전처 DUR 병용금기";

    private final RestClient restClient;
    private final String serviceKey;
    private final String path;
    private final Map<String, Optional<DurContraindication>> cache = new ConcurrentHashMap<>();

    public PublicDataDurClient(
            RestClient.Builder builder,
            @Value("${dur.base-url}") String baseUrl,
            @Value("${dur.path:/getUsjntTabooInfoList02}") String path,
            @Value("${dur.service-key:}") String serviceKey
    ) {
        this.restClient = builder.baseUrl(baseUrl).build();
        this.path = path;
        this.serviceKey = serviceKey;
    }

    @Override
    public Optional<DurContraindication> findContraindication(String itemSeqA, String itemSeqB) {
        if (isBlank(itemSeqA) || isBlank(itemSeqB) || itemSeqA.equals(itemSeqB)) {
            return Optional.empty();
        }

        String cacheKey = createCacheKey(itemSeqA, itemSeqB);
        return cache.computeIfAbsent(cacheKey, ignored -> requestSafely(itemSeqA, itemSeqB));
    }

    private Optional<DurContraindication> requestSafely(String itemSeqA, String itemSeqB) {
        if (serviceKey.isBlank()) {
            log.warn("DUR_SERVICE_KEY가 없어 병용금기 검사를 건너뜁니다.");
            return Optional.empty();
        }

        try {
            Optional<DurContraindication> result = request(itemSeqA, itemSeqB);

            if (result.isPresent()) {
                return result;
            }

            return request(itemSeqB, itemSeqA);
        } catch (RestClientException | IllegalArgumentException exception) {
            log.warn("식약처 DUR API 호출에 실패했습니다. itemSeqA={}, itemSeqB={}", itemSeqA, itemSeqB);
            return Optional.empty();
        }
    }

    private Optional<DurContraindication> request(String itemSeq, String pairedItemSeq) {
        JsonNode response = restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path(path)
                        .queryParam("serviceKey", serviceKey)
                        .queryParam("pageNo", 1)
                        .queryParam("numOfRows", 100)
                        .queryParam("type", "json")
                        .queryParam("itemSeq", itemSeq)
                        .build())
                .retrieve()
                .body(JsonNode.class);

        for (JsonNode item : extractItems(response)) {
            String firstItemSeq = text(item, "ITEM_SEQ", "itemSeq");
            String secondItemSeq = text(item, "MIXTURE_ITEM_SEQ", "mixtureItemSeq");

            if (!isSamePair(itemSeq, pairedItemSeq, firstItemSeq, secondItemSeq)) {
                continue;
            }

            return Optional.of(new DurContraindication(
                    firstItemSeq,
                    secondItemSeq,
                    text(item, "ITEM_NAME", "itemName"),
                    text(item, "MIXTURE_ITEM_NAME", "mixtureItemName"),
                    text(item, "PROHBT_CONTENT", "prohbtContent"),
                    SOURCE
            ));
        }

        return Optional.empty();
    }

    private List<JsonNode> extractItems(JsonNode response) {
        if (response == null) {
            return List.of();
        }

        JsonNode itemNode = response.path("response")
                .path("body")
                .path("items")
                .path("item");

        if (itemNode.isArray()) {
            List<JsonNode> items = new ArrayList<>();
            itemNode.forEach(items::add);
            return items;
        }

        if (itemNode.isObject()) {
            return List.of(itemNode);
        }

        return List.of();
    }

    private String text(JsonNode node, String upperCaseName, String camelCaseName) {
        JsonNode value = node.get(upperCaseName);

        if (value == null || value.isNull()) {
            value = node.get(camelCaseName);
        }

        return value == null || value.isNull() ? null : value.asText();
    }

    private boolean isSamePair(
            String requestedA,
            String requestedB,
            String responseA,
            String responseB
    ) {
        return requestedA.equals(responseA) && requestedB.equals(responseB)
                || requestedA.equals(responseB) && requestedB.equals(responseA);
    }

    private String createCacheKey(String itemSeqA, String itemSeqB) {
        return itemSeqA.compareTo(itemSeqB) < 0
                ? itemSeqA + ":" + itemSeqB
                : itemSeqB + ":" + itemSeqA;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
