import sys
import os
from logging.config import fileConfig

from sqlalchemy import create_engine
from sqlalchemy import pool
from alembic import context

# --- Make sure Alembic can see your app ---
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.database import Base  # Your declarative_base
# Import every model module, not just a few (and not only those listed in
# app/models/__init__.py). Autogenerate compares the database with
# Base.metadata, and a table missing from it looks like one to drop.
import importlib
import pkgutil

import app.models

for _module in pkgutil.iter_modules(app.models.__path__):
    importlib.import_module(f"app.models.{_module.name}")
# Import environment variables
from dotenv import load_dotenv
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Alembic Config object
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set target_metadata (all models’ metadata)
target_metadata = Base.metadata

# --- Tables this app does not own ---------------------------------------
# The same database holds the mobile app's tables, created and migrated by
# its Django backend: every one is prefixed `agriscan_`, plus Django's own
# `auth_*` and `django_*`. Alembic must never alter or drop them.
FOREIGN_TABLE_PREFIXES = ("agriscan_", "auth_", "django_")


def include_name(name, type_, parent_names):
    """Don't even reflect the mobile app's tables."""
    if type_ == "table":
        return not name.startswith(FOREIGN_TABLE_PREFIXES)
    return True


def include_object(obj, name, type_, reflected, compare_to):
    """Never propose dropping a table this app does not model.

    A table that exists in the database (`reflected`) but has no model
    (`compare_to is None`) belongs to someone else - the mobile app, or a
    table the web reads without mapping. Autogenerate's default is to emit
    `drop_table` for it; this turns that into "leave it alone". Creating
    tables for new models and changing modelled tables still works.
    """
    if type_ == "table":
        if name.startswith(FOREIGN_TABLE_PREFIXES):
            return False
        if reflected and compare_to is None:
            return False
    return True

# --- Database connection setup ---
def run_migrations_offline():
    """Run migrations in 'offline' mode."""
    url = DATABASE_URL
    context.configure(
        url=url,
        target_metadata=target_metadata,
        include_name=include_name,
        include_object=include_object,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    """Run migrations in 'online' mode."""
    connectable = create_engine(
        DATABASE_URL,
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_name=include_name,
            include_object=include_object,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
