package vn.weconex.aptis.conversation.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

/** Versioned voice instructions, separate from session and payment orchestration. */
@Component
public class AiConversationPrompt {
    private final ObjectMapper objectMapper;
    private final String instructions;
    private final String profile;

    public AiConversationPrompt(ObjectMapper objectMapper,
            @Value("classpath:conversation/prompts/viet-friend-v2.txt") Resource instructionsResource,
            @Value("${aptis.ai-conversation.personality-resource:classpath:conversation/prompts/viet-friend-profile.json}")
                    Resource profileResource) throws IOException {
        this.objectMapper = objectMapper;
        instructions = instructionsResource.getContentAsString(StandardCharsets.UTF_8).strip();
        var profileJson = objectMapper.readTree(profileResource.getContentAsString(StandardCharsets.UTF_8));
        if (instructions.isBlank() || profileJson == null || !profileJson.isObject()
                || !profileJson.path("id").isTextual() || profileJson.path("id").asText().isBlank()) {
            throw new IOException("AI conversation instructions or personality profile are invalid");
        }
        profile = objectMapper.writeValueAsString(profileJson);
    }

    public String build(String topic, String level, String previousContext) {
        Map<String, String> context = new LinkedHashMap<>();
        context.put("learner_level", level == null ? "B1" : level);
        context.put("topic", topic == null ? "Daily life" : topic);
        context.put("conversation_mode", "Free Conversation");
        context.put("previous_session_context", previousContext == null ? "" : previousContext);
        try {
            return instructions + "\n\nPERSONALITY_PROFILE\n" + profile
                    + "\n\nSESSION_CONTEXT_JSON\n" + objectMapper.writeValueAsString(context);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Cannot encode AI conversation context", ex);
        }
    }
}
