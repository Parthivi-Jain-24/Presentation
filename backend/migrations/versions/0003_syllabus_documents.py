"""Store uploaded syllabus references for local lesson grounding."""
from alembic import op
from sqlalchemy import inspect

from app.models import SyllabusDocument

revision = "0003_syllabus_documents"
down_revision = "0002_lesson_feedback"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    if not inspect(bind).has_table(SyllabusDocument.__tablename__):
        SyllabusDocument.__table__.create(bind=bind)


def downgrade():
    bind = op.get_bind()
    if inspect(bind).has_table(SyllabusDocument.__tablename__):
        SyllabusDocument.__table__.drop(bind=bind)
