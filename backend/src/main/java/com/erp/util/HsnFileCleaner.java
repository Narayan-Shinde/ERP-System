package com.erp.util;

import java.io.*;
import java.nio.file.*;
import java.util.regex.*;

public class HsnFileCleaner {
    public static void main(String[] args) {
        try {
            // Read the original file
            String content = Files.readString(Paths.get("src/main/resources/HSN_SAC.json"));
            
            // Fix common issues
            content = content.replaceAll("\"desc\":\\s*\"other\"", "\"desc\": \"OTHER\"");
            content = content.replaceAll("\"desc\":\\s*\"livestock\"", "\"desc\": \"LIVESTOCK\"");
            content = content.replaceAll("MULESANDHINNIES", "MULES AND HINNIES");
            content = content.replaceAll("ANIMAL S OTHER", "ANIMALS - OTHER");
            content = content.replaceAll("\\s+", " ");
            
            // Write back to file
            Files.writeString(Paths.get("src/main/resources/HSN_SAC.json"), content);
            
            System.out.println("HSN_SAC.json cleaned successfully!");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
