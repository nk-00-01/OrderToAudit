
from models import AuditLog


def write_audit_log(
    db,
    actor,
    action: str,
    module: str,
    entity_type: str,
    entity_id=None,
    description: str = "",
    details: dict | None = None,
):
    """
    Add an audit record to the current database transaction.
    The calling endpoint is responsible for committing.
    """

    log = AuditLog(
        actor_id=actor.id if actor else None,
        action=action,
        module=module,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        description=description,
        details=details,
    )

    db.add(log)

    return log
