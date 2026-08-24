package com.medilink;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class MediLinkApplication {

    public static void main(String[] args) {
        SpringApplication.run(MediLinkApplication.class, args);
    }
}
