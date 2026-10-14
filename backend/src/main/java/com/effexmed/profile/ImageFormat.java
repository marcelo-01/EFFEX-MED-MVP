package com.effexmed.profile;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Optional;

/**
 * Formatos aceitos para foto de perfil, identificados pelos primeiros bytes do arquivo
 * (o tipo informado pelo navegador não é confiável).
 */
enum ImageFormat {
    JPEG("image/jpeg"),
    PNG("image/png"),
    WEBP("image/webp");

    private static final byte[] PNG_SIGNATURE = { (byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n' };

    private final String contentType;

    ImageFormat(String contentType) {
        this.contentType = contentType;
    }

    String contentType() {
        return contentType;
    }

    static Optional<ImageFormat> detect(byte[] data) {
        if (data.length >= 3 && (data[0] & 0xFF) == 0xFF && (data[1] & 0xFF) == 0xD8 && (data[2] & 0xFF) == 0xFF) {
            return Optional.of(JPEG);
        }
        if (data.length >= PNG_SIGNATURE.length && Arrays.equals(data, 0, PNG_SIGNATURE.length, PNG_SIGNATURE, 0,
                PNG_SIGNATURE.length)) {
            return Optional.of(PNG);
        }
        if (data.length >= 12 && ascii(data, 0, 4).equals("RIFF") && ascii(data, 8, 12).equals("WEBP")) {
            return Optional.of(WEBP);
        }
        return Optional.empty();
    }

    private static String ascii(byte[] data, int from, int to) {
        return new String(data, from, to - from, StandardCharsets.US_ASCII);
    }
}
