package com.helpdesk.dto;

import com.helpdesk.entity.Comment;
import com.helpdesk.entity.Ticket;
import com.helpdesk.entity.User;
import java.util.ArrayList;
import java.util.List;
import javax.annotation.processing.Generated;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-06-29T13:45:40+0200",
    comments = "version: 1.6.3, compiler: javac, environment: Java 21.0.6 (Oracle Corporation)"
)
@Component
public class TicketMapperImpl implements TicketMapper {

    @Autowired
    private CommentMapper commentMapper;

    @Override
    public TicketDTO toDTO(Ticket entity) {
        if ( entity == null ) {
            return null;
        }

        TicketDTO ticketDTO = new TicketDTO();

        ticketDTO.setAssigneeId( entityAssigneeId( entity ) );
        ticketDTO.setId( entity.getId() );
        ticketDTO.setTitle( entity.getTitle() );
        ticketDTO.setDescription( entity.getDescription() );
        ticketDTO.setStatus( entity.getStatus() );
        ticketDTO.setPriority( entity.getPriority() );
        ticketDTO.setCreatedAt( entity.getCreatedAt() );
        ticketDTO.setUpdatedAt( entity.getUpdatedAt() );
        ticketDTO.setComments( commentListToCommentDTOList( entity.getComments() ) );

        return ticketDTO;
    }

    @Override
    public Ticket toEntity(TicketDTO dto) {
        if ( dto == null ) {
            return null;
        }

        Ticket.TicketBuilder ticket = Ticket.builder();

        ticket.title( dto.getTitle() );
        ticket.description( dto.getDescription() );
        ticket.status( dto.getStatus() );
        ticket.priority( dto.getPriority() );
        ticket.createdAt( dto.getCreatedAt() );
        ticket.updatedAt( dto.getUpdatedAt() );

        return ticket.build();
    }

    private String entityAssigneeId(Ticket ticket) {
        User assignee = ticket.getAssignee();
        if ( assignee == null ) {
            return null;
        }
        return assignee.getId();
    }

    protected List<CommentDTO> commentListToCommentDTOList(List<Comment> list) {
        if ( list == null ) {
            return null;
        }

        List<CommentDTO> list1 = new ArrayList<CommentDTO>( list.size() );
        for ( Comment comment : list ) {
            list1.add( commentMapper.toDTO( comment ) );
        }

        return list1;
    }
}
