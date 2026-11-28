"""add_vector_embeddings_and_rag_fields

Revision ID: 9f438ab989e5
Revises: dbf9b37c0d46
Create Date: 2026-11-28 13:08:22.255948

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


# revision identifiers, used by Alembic.
revision: str = '9f438ab989e5'
down_revision: Union[str, Sequence[str], None] = 'dbf9b37c0d46'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('conversations', sa.Column('selected_document_ids', sa.Text(), nullable=True))
    op.add_column('document_chunks', sa.Column('metadata_json', sa.Text(), nullable=True))
    op.add_column('document_chunks', sa.Column('embedding', Vector(1536), nullable=True))
    op.add_column('documents', sa.Column('chunk_count', sa.Integer(), nullable=True))
    # HNSW index for high-performance cosine similarity retrieval
    op.create_index(
        'idx_document_chunks_embedding',
        'document_chunks',
        ['embedding'],
        unique=False,
        postgresql_using='hnsw',
        postgresql_ops={'embedding': 'vector_cosine_ops'},
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('idx_document_chunks_embedding', table_name='document_chunks')
    op.drop_column('documents', 'chunk_count')
    op.drop_column('document_chunks', 'embedding')
    op.drop_column('document_chunks', 'metadata_json')
    op.drop_column('conversations', 'selected_document_ids')
