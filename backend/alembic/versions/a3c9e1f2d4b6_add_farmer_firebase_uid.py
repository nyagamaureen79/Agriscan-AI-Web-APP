"""add FarmerRegistration.firebase_uid for mobile app accounts

The mobile app (Django backend, sharing this database) signs farmers in with
Firebase. Each mobile farmer is written to FarmerRegistration with the
Firebase uid, so the web's farmer lists, approvals and reports include them
and both systems resolve the same person to the same row. Nullable, so every
existing web-managed farmer stays valid.

Production's alembic_version is empty although the schema is at
1b1fb8bde557. Stamp before upgrading, or `upgrade head` re-creates `users`:

    alembic stamp 1b1fb8bde557
    alembic upgrade head

Deploy code that maps `firebase_uid` only after this has run: the startup
`create_all` never adds columns, so the model would query a missing column.

Revision ID: a3c9e1f2d4b6
Revises: 1b1fb8bde557
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a3c9e1f2d4b6"
down_revision: Union[str, Sequence[str], None] = "1b1fb8bde557"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLE = "FarmerRegistration"
COLUMN = "firebase_uid"
INDEX = "ix_FarmerRegistration_firebase_uid"


def _inspector():
    return sa.inspect(op.get_bind())


def upgrade() -> None:
    # Idempotent: a database where the column was added by hand, or by an
    # earlier branch migration, is left as it is.
    inspector = _inspector()
    if COLUMN not in {c["name"] for c in inspector.get_columns(TABLE)}:
        op.add_column(TABLE, sa.Column(COLUMN, sa.String(length=128), nullable=True))
    if INDEX not in {i["name"] for i in _inspector().get_indexes(TABLE)}:
        op.create_index(INDEX, TABLE, [COLUMN], unique=True)


def downgrade() -> None:
    inspector = _inspector()
    if INDEX in {i["name"] for i in inspector.get_indexes(TABLE)}:
        op.drop_index(INDEX, table_name=TABLE)
    if COLUMN in {c["name"] for c in _inspector().get_columns(TABLE)}:
        op.drop_column(TABLE, COLUMN)
