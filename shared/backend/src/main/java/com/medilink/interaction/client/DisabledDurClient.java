package com.medilink.interaction.client;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
@ConditionalOnProperty(name = "dur.enabled", havingValue = "false", matchIfMissing = true)
public class DisabledDurClient implements DurClient {

    @Override
    public Optional<DurContraindication> findContraindication(String itemSeqA, String itemSeqB) {
        return Optional.empty();
    }
}
