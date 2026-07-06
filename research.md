# Research: sistema de comentarios para tickets

## Resumen ejecutivo

La forma mas coherente de implementar comentarios en `app-ticketing` es como subrecurso del `Ticket` y como bloque embebido en la vista de detalle del ticket.

La razon principal es que el repo ya esta orientado a ese modelo: la DSL define `Ticket -> comments`, el use case `add_comment` ya existe, y el generador ya conoce tanto la ruta REST como parte de la logica de frontend/backend. Lo que falta es cerrar la experiencia de extremo a extremo en la UI y eliminar inconsistencias en algunas salidas generadas.

## Hallazgos clave

### 1. La spec ya modela comentarios como parte del ticket

En `yaml-to-code-generator/specs/helpdesk.yaml` el `Ticket` declara la relacion `comments` hacia `Comment`, y ademas incluye el use case `add_comment`.

- `Ticket.comments` apunta a `Comment`.
- `Comment` tiene `ticketId`, `authorId`, `text` y `createdAt`.
- Existe una regla de negocio que exige comentario para cerrar el ticket: `newStatus !== 'CLOSED' || entity.comments.length > 0`.

Esto indica que el dominio ya considera los comentarios como parte del agregado del ticket, no como una entidad aislada.

### 2. El generador ya reconoce `add_comment`

En `yaml-to-code-generator/src/ir/use-case-resolver.ts`, `add_comment` esta mapeado a:

- `methodName: addComment`
- `httpMethod: POST`
- `pathSuffix: /{id}/comments`

Eso significa que la DSL ya puede expresar el caso de uso sin inventar un nuevo convenio.

### 3. La capa Vue ya tiene soporte parcial

En `yaml-to-code-generator/src/generation/vue/builder.ts` hay logica especifica para:

- detectar soporte de comentarios con `hasCommentSupport`
- vincular `add_comment` con el tipo de respuesta `Comment`
- inyectar la actualizacion del estado local con `this.current?.id === idParam` y `this.current.comments.push(createdComment)`

Sin embargo, la plantilla de detalle en `yaml-to-code-generator/src/generators/vue/templates/views/EntityDetailView.vue.ejs` solo renderiza la timeline de actividad, no una seccion dedicada de comentarios.

### 4. La capa Spring tambien tiene soporte parcial

En `yaml-to-code-generator/src/generation/spring/builder.ts` existe una rama especifica para `add_comment` que:

- busca la entidad `Comment`
- enlaza el comentario con el `Ticket`
- persiste el comentario via `CommentRepository`
- devuelve `CommentDTO`

Eso confirma que el backend ya contempla comentarios como operacion nativa del ticket.

### 5. Hay una inconsistencia entre la intencion y algunas salidas generadas

Los fixtures golden muestran dos interpretaciones distintas del mismo concepto:

- un flujo centrado en `Ticket` con `POST /tickets/{id}/comments`
- un modulo `Comment` mas autonomo con `CommentService`, `CommentController` y `comment.store.ts`

Ademas, el `CommentController` golden muestra signos de salida incompleta o incorrecta, asi que no conviene tomar ese artefacto como referencia final sin revisar.

### 6. La UI actual no muestra comentarios

En `generated-repos/vue-frontend/src/views/TicketDetailView.vue` la pantalla de detalle carga el ticket y la actividad, pero no incluye:

- lista de comentarios
- formulario para crear comentarios
- refresco explicito de comentarios tras crear uno

Es decir, la experiencia esta a medio camino: existe el contrato tecnico, pero no el bloque visual completo.

## Opciones evaluadas

### Opcion A: comentarios como subrecurso del ticket

Descripcion:

- API: `POST /api/tickets/{id}/comments`
- datos: `Comment` con `ticketId`, `authorId`, `text`, `createdAt`
- UI: formulario + lista embebidos en `TicketDetailView`

Ventajas:

- encaja con la DSL actual
- minimiza cambios de arquitectura
- mantiene comentarios cerca del contexto del ticket
- reutiliza la logica ya existente en el generador

Costes:

- hay que completar la vista de detalle
- hay que asegurar que el backend resuelva bien el autor del comentario

### Opcion B: comentarios como modulo propio

Descripcion:

- API y store propios para `Comment`
- vistas separadas para listar, crear y moderar comentarios

Ventajas:

- mejor si se quiere busqueda global o moderacion independiente
- puede escalar mejor si comentarios dejan de ser un subproducto del ticket

Costes:

- mas complejidad
- mas superficie de mantenimiento
- rompe la coherencia del modelo actual, que ya gira alrededor del ticket

### Opcion C: comentarios mezclados con ActivityLog

Descripcion:

- reutilizar la timeline como si comentarios y eventos fueran lo mismo

Ventajas:

- menor trabajo de UI a corto plazo

Costes:

- mala semantica
- mezcla conversacion con auditoria
- complica la evolucion futura

## Riesgos y tradeoffs

1. **Duplicidad conceptual**
   - Si se separa `Comment` como modulo autonomo sin una razon funcional clara, se duplica la navegacion y se diluye el modelo de dominio.

2. **Payload de detalle mas pesado**
   - `TicketDTO` ya incluye `comments` en los golden fixtures. Si se cargan comentarios embebidos sin cuidado, el detalle puede crecer demasiado.

3. **Autor del comentario incompleto**
   - En la logica generada se ve un `TODO` para asignar autor desde autenticacion. Ese hueco hay que cerrarlo para que el sistema sea consistente.

4. **Inconsistencia entre generacion y fixtures**
   - El generador apunta a un flujo centrado en ticket, pero algunos fixtures reflejan un modulo `Comment` independiente. Hay que elegir un solo contrato y alinear templates y tests.

## Recomendacion

Recomiendo implementar comentarios como subrecurso del ticket y exponerlos dentro del detalle del ticket.

Motivos:

- es la opcion mas alineada con la spec actual
- requiere menos cambios estructurales
- encaja con el flujo natural del usuario
- permite mantener clara la diferencia entre comentarios y actividad/auditoria

## Proximo paso sugerido

Si se va a llevar esto a implementacion, el orden mas pragmatico es:

1. Cerrar el backend de `addComment` con autor y persistencia consistentes.
2. Extender `TicketDetailView` para listar y crear comentarios.
3. Ajustar el store de ticket para refrescar comentarios despues de crear uno.
4. Revisar los fixtures golden para eliminar la doble interpretacion de `Comment`.
5. Si hace falta, separar actividad y comentarios visualmente en la UI.
