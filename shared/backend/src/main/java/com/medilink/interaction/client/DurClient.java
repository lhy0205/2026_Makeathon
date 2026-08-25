package com.medilink.interaction.client;

import java.util.Optional;

public interface DurClient {

    Optional<DurContraindication> findContraindication(String itemSeqA, String itemSeqB);
}
