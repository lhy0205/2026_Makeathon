package com.medilink.prescription.storage;

import com.medilink.global.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class PrescriptionImageStorage {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp");

    private final Path storageDirectory;

    public PrescriptionImageStorage(
            @Value("${storage.prescriptions-directory:uploads/prescriptions}") String directory
    ) {
        this.storageDirectory = Path.of(directory).toAbsolutePath().normalize();
        createStorageDirectory();
    }

    public String save(MultipartFile image) {
        validateImage(image);
        String extension = findExtension(image.getOriginalFilename());
        String storageKey = UUID.randomUUID() + "." + extension;
        Path target = resolve(storageKey);

        try {
            image.transferTo(target);
            return storageKey;
        } catch (IOException exception) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "처방전 이미지를 저장하지 못했습니다.");
        }
    }

    public String extractStorageKey(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return null;
        }

        String storageKey = imageUrl.substring(imageUrl.lastIndexOf('/') + 1);
        Path imagePath = resolve(storageKey);

        if (!Files.isRegularFile(imagePath)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "저장된 처방전 이미지를 찾을 수 없습니다.");
        }

        return storageKey;
    }

    public StoredPrescriptionImage load(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "처방전 이미지가 없습니다.");
        }

        Path imagePath = resolve(storageKey);

        if (!Files.isRegularFile(imagePath)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "처방전 이미지를 찾을 수 없습니다.");
        }

        try {
            Resource resource = new UrlResource(imagePath.toUri());
            String contentType = Files.probeContentType(imagePath);
            MediaType mediaType = contentType == null
                    ? MediaType.APPLICATION_OCTET_STREAM
                    : MediaType.parseMediaType(contentType);

            return new StoredPrescriptionImage(resource, mediaType);
        } catch (IOException exception) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "처방전 이미지를 읽지 못했습니다.");
        }
    }

    private void validateImage(MultipartFile image) {
        if (image.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "처방전 이미지를 선택해 주세요.");
        }

        String contentType = image.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "이미지 파일만 업로드할 수 있습니다.");
        }
    }

    private String findExtension(String originalFilename) {
        if (originalFilename == null || !originalFilename.contains(".")) {
            return "jpg";
        }

        String extension = originalFilename.substring(originalFilename.lastIndexOf('.') + 1)
                .toLowerCase(Locale.ROOT);

        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "지원하지 않는 이미지 형식입니다.");
        }

        return extension;
    }

    private Path resolve(String storageKey) {
        String fileName = Path.of(storageKey).getFileName().toString();
        Path resolved = storageDirectory.resolve(fileName).normalize();

        if (!resolved.startsWith(storageDirectory)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "올바르지 않은 이미지 경로입니다.");
        }

        return resolved;
    }

    private void createStorageDirectory() {
        try {
            Files.createDirectories(storageDirectory);
        } catch (IOException exception) {
            throw new IllegalStateException("처방전 이미지 저장 폴더를 만들 수 없습니다.", exception);
        }
    }
}
