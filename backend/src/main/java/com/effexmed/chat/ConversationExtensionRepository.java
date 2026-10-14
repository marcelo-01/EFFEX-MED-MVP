package com.effexmed.chat;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ConversationExtensionRepository extends JpaRepository<ConversationExtension, Long> {

    List<ConversationExtension> findByConversationIdOrderByCreatedAtDesc(Long conversationId);

    @Query("""
            select e.conversation.id as conversationId, count(e) as total
            from ConversationExtension e
            where e.conversation.id in :conversationIds
            group by e.conversation.id
            """)
    List<CountByConversation> countByConversation(Collection<Long> conversationIds);

    void deleteByConversationId(Long conversationId);
}
