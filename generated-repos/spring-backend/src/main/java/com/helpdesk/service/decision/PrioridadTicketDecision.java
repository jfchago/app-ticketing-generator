
package com.helpdesk.service.decision;

import lombok.extern.slf4j.Slf4j;

import java.util.*;

@Slf4j
public class PrioridadTicketDecision {

    public static class Case {
        private final String condition;
        private final List<String> actions;

        public Case(String condition, List<String> actions) {
            this.condition = condition;
            this.actions = actions;
        }

        public String getCondition() { return condition; }
        public List<String> getActions() { return actions; }
    }

    public static class Result {
        private final boolean matched;
        private final List<String> actions;

        public Result(boolean matched, List<String> actions) {
            this.matched = matched;
            this.actions = actions;
        }

        public boolean isMatched() { return matched; }
        public List<String> getActions() { return actions; }
    }

    public static Result evaluate(Map<String, Object> input) {

        if (Boolean.TRUE.equals(input.get("Urgente"))) {
            log.debug("Case 'Urgente' matched");
            return new Result(true, List.of(

                "notificarAdmin",

                "asignarPrioritario"

            ));
        }

        if (Boolean.TRUE.equals(input.get("Alta"))) {
            log.debug("Case 'Alta' matched");
            return new Result(true, List.of(

                "notificarAdmin",

                "asignarSiguiente"

            ));
        }

        log.debug("No case matched, using default");
        return new Result(true, List.of(

            "asignarSiguiente"

        ));
    }
}
