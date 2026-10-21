"""Add persistent teacher feedback for lesson QA."""
from alembic import op
from sqlalchemy import inspect

from app.models import LessonFeedback

revision = "0002_lesson_feedback"
down_revision = "0001_platform_schema"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    if not inspect(bind).has_table(LessonFeedback.__tablename__):
        LessonFeedback.__table__.create(bind=bind)


def downgrade():
    bind = op.get_bind()
    if inspect(bind).has_table(LessonFeedback.__tablename__):
        LessonFeedback.__table__.drop(bind=bind)
