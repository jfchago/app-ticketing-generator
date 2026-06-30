package com.helpdesk.dto;

import com.helpdesk.entity.Comment;
import com.helpdesk.entity.Ticket;
import com.helpdesk.entity.User;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-06-29T13:45:40+0200",
    comments = "version: 1.6.3, compiler: javac, environment: Java 21.0.6 (Oracle Corporation)"
)
@Component
public class CommentMapperImpl implements CommentMapper {

    @Override
    public CommentDTO toDTO(Comment entity) {
        if ( entity == null ) {
            return null;
        }

        CommentDTO commentDTO = new CommentDTO();

        commentDTO.setTicketId( entityTicketId( entity ) );
        commentDTO.setAuthorId( entityAuthorId( entity ) );
        commentDTO.setId( entity.getId() );
        commentDTO.setText( entity.getText() );
        commentDTO.setCreatedAt( entity.getCreatedAt() );

        return commentDTO;
    }

    @Override
    public Comment toEntity(CommentDTO dto) {
        if ( dto == null ) {
            return null;
        }

        Comment comment = new Comment();

        comment.setText( dto.getText() );
        comment.setCreatedAt( dto.getCreatedAt() );

        return comment;
    }

    private String entityTicketId(Comment comment) {
        Ticket ticket = comment.getTicket();
        if ( ticket == null ) {
            return null;
        }
        return ticket.getId();
    }

    private String entityAuthorId(Comment comment) {
        User author = comment.getAuthor();
        if ( author == null ) {
            return null;
        }
        return author.getId();
    }
}
