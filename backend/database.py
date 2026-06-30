from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from config import settings

engine = create_async_engine(
    settings.database_url,
    echo=settings.APP_DEBUG,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    async with engine.begin() as conn:
        import sqlalchemy
        # Drop old photos table and enum so create_all rebuilds with new schema
        await conn.execute(sqlalchemy.text("DROP TABLE IF EXISTS photos CASCADE"))
        await conn.execute(sqlalchemy.text("DROP TYPE IF EXISTS photocategory CASCADE"))
        await conn.execute(sqlalchemy.text("DROP TYPE IF EXISTS phototype CASCADE"))
        await conn.run_sync(Base.metadata.create_all)
