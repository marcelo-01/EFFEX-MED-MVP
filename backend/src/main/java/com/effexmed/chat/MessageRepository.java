package com.effexmed.chat;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface MessageRepository extends JpaRepository<Message, Long> {

    List<Message> findByConversationIdOrderByIdAsc(Long conversationId);

    boolean existsByConversationIdAndTypeIn(Long conversationId, Collection<MessageType> types);

    boolean existsByConversationId(Long conversationId);

    /** Última mensagem de cada conversa (o id é crescente no tempo). */
    @Query("""
            select m from Message m
            where m.id in (
                select max(m2.id) from Message m2
                where m2.conversation.id in :conversationIds
                group by m2.conversation.id)
            """)
    List<Message> findLastMessages(Collection<Long> conversationIds);

    /** Quantidade de mensagens não lidas pelo usuário em cada conversa. */
    @Query("""
            select m.conversation.id as conversationId, count(m) as total
            from Message m
            where m.conversation.id in :conversationIds
              and m.readAt is null
              and m.sender is not null
              and m.sender.id <> :userId
            group by m.conversation.id
            """)
    List<CountByConversation> countUnread(Collection<Long> conversationIds, Long userId);

    @Query("""
            select m.conversation.id as conversationId, count(m) as total
            from Message m
            where m.conversation.id in :conversationIds and m.type in :types
            group by m.conversation.id
            """)
    List<CountByConversation> countByTypes(Collection<Long> conversationIds, Collection<MessageType> types);

    @Modifying
    @Query("""
            update Message m set m.readAt = :readAt
            where m.conversation.id = :conversationId
              and m.readAt is null
              and m.sender is not null
              and m.sender.id <> :readerId
            """)
    int markAsRead(Long conversationId, Long readerId, Instant readAt);

    void deleteByConversationId(Long conversationId);
}
