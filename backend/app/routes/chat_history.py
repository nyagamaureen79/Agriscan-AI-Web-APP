from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, literal

from app.database import get_db
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.message_topic import MessageTopic
from app.models.message_subtopic import MessageSubTopic
from app.models.users import User
from app.auth import get_current_user

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])

# ─────────────────────────────────────────────────────────────────────────────
# CAPABILITY FLAGS
#
# These check whether Justin's schema additions exist on the model *right now*.
# Nothing here needs to change when he ships them — the moment a column is
# added to app/models/conversation.py (or the Farmer/UnansweredQuery models
# are created), the corresponding flag flips to True and every endpoint below
# automatically starts using real data instead of the mock fallback.
#
# subtopic is no longer on this list — Message.subtopic_id already exists,
# so topSubtopic/subtopic are computed from real data below. farmerName is
# also real now, joined from app.models.farmer.FarmerRegistration. Only
# status (resolved/escalated/abandoned) and detected_language are still
# pending from Justin.
# ─────────────────────────────────────────────────────────────────────────────

HAS_STATUS = hasattr(Conversation, "status")
HAS_TURN_COUNT = hasattr(Conversation, "turn_count")
HAS_LANGUAGE = hasattr(Conversation, "detected_language")
HAS_RESOLVED_AT = hasattr(Conversation, "resolved_at")
HAS_IS_RETURN_USER = hasattr(Conversation, "is_return_user")
HAS_MESSAGE_SUBTOPIC = hasattr(Message, "subtopic_id")  # real now — Message.subtopic_id exists

try:
    from app.models.farmer import FarmerRegistration
    HAS_FARMER_MODEL = True
except ImportError:
    FarmerRegistration = None
    HAS_FARMER_MODEL = False

try:
    from app.models.unanswered_query import UnansweredQuery  # noqa: F401
    HAS_UNANSWERED_QUERY = True
except ImportError:
    UnansweredQuery = None
    HAS_UNANSWERED_QUERY = False


# ─────────────────────────────────────────────────────────────────────────────
# MOCK SEEDS
#
# These mirror the mock data already hardcoded in ChatbotInsightsReport.jsx.
# They exist ONLY to fill in fields we cannot compute yet (status, language,
# subtopic). They are blended with real counts (e.g. resolved = real
# conversations * mock ratio) so the numbers move as real volume grows,
# instead of being frozen. Delete each block once its HAS_* flag goes True.
# ─────────────────────────────────────────────────────────────────────────────

MOCK_TOPIC_ANALYTICS = {
    # topic_name: (resolved_pct, escalated_pct) — only status is still mocked;
    # top subtopic is computed for real below via Message.subtopic_id.
    "Crop Disease":     (0.897, 0.055),
    "Weather":          (0.940, 0.024),
    "Market Prices":    (0.950, 0.020),
    "Agronomy Tips":    (0.930, 0.039),
    "Financial":        (0.870, 0.100),
    "Pest Control":     (0.917, 0.046),
    "Soil Health":      (0.950, 0.021),
    "Livestock":        (0.855, 0.107),
    "Water Management": (0.900, 0.036),
}
DEFAULT_TOPIC_ANALYTICS = (0.90, 0.05)

MOCK_LANGUAGES = ["English", "Swahili", "Sheng", "Kikuyu", "Luo"]
MOCK_STATUSES = ["Resolved", "Resolved", "Resolved", "Escalated", "Abandoned"]

MOCK_GLOBAL_RESOLUTION_RATE = 94.2
MOCK_GLOBAL_ESCALATION_RATE = 8.3


def _resolve_date_range(date_range: str) -> datetime:
    now = datetime.utcnow()
    mapping = {
        "Last 7 Days": now - timedelta(days=7),
        "Last 30 Days": now - timedelta(days=30),
        "Last 3 Months": now - timedelta(days=90),
        "This Year": datetime(now.year, 1, 1),
    }
    return mapping.get(date_range, now - timedelta(days=30))


# ─────────────────────────────────────────────────────────────────────────────
# /chatbot/stats  (extends the existing endpoint with the report-page cards)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/stats")
def get_chatbot_stats(
    dateRange: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant_id = current_user.tenant_id
    # None / omitted -> original behavior: count everything, no date filter.
    window_start = _resolve_date_range(dateRange) if dateRange else None

    conv_filters = [Conversation.tenant_id == tenant_id]
    msg_filters = [Message.tenant_id == tenant_id]
    if window_start is not None:
        conv_filters.append(Conversation.started_at >= window_start)
        msg_filters.append(Message.created_at >= window_start)

    total_conversations = db.query(Conversation).filter(*conv_filters).count()
    total_messages = db.query(Message).filter(*msg_filters).count()

    avg_messages_per_conversation = (
        round(total_messages / total_conversations, 1) if total_conversations else 0
    )

    # Resolution / escalation rate — real once HAS_STATUS is True.
    if HAS_STATUS:
        resolved_count = db.query(Conversation).filter(
            *conv_filters, Conversation.status == "resolved"
        ).count()
        escalated_count = db.query(Conversation).filter(
            *conv_filters, Conversation.status == "escalated"
        ).count()
        resolution_rate = round((resolved_count / total_conversations) * 100, 1) if total_conversations else 0
        escalation_rate = round((escalated_count / total_conversations) * 100, 1) if total_conversations else 0
    else:
        resolution_rate = MOCK_GLOBAL_RESOLUTION_RATE
        escalation_rate = MOCK_GLOBAL_ESCALATION_RATE

    # Most active topic — always real, driven by Message.topic_id.
    top_topic_row = db.query(
        MessageTopic.topic_name,
        func.count(func.distinct(Message.conversation_id)).label("conversations"),
    ).join(
        Message, Message.topic_id == MessageTopic.id
    ).filter(*msg_filters).group_by(MessageTopic.id, MessageTopic.topic_name).order_by(
        func.count(func.distinct(Message.conversation_id)).desc()
    ).first()
    most_active_topic = top_topic_row.topic_name if top_topic_row else "—"

    if window_start is not None:
        days_in_range = max((datetime.utcnow() - window_start).days, 1)
        avg_daily_volume = round(total_conversations / days_in_range) if total_conversations else 0
    else:
        # No window requested — fall back to a 30-day volume estimate without
        # changing the (unfiltered) totals above.
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_count = db.query(Conversation).filter(
            Conversation.tenant_id == tenant_id,
            Conversation.started_at >= thirty_days_ago,
        ).count()
        avg_daily_volume = round(recent_count / 30) if recent_count else 0

    return {
        "totalConversations": total_conversations,
        "totalMessages": total_messages,
        "avgMessagesPerConversation": avg_messages_per_conversation,
        "resolutionRate": resolution_rate,
        "escalationRate": escalation_rate,
        "avgTurnDepth": avg_messages_per_conversation,
        "mostActiveTopic": most_active_topic,
        "avgDailyVolume": avg_daily_volume,
    }

@router.get("/report/topics")
def get_report_topics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    topics = (
        db.query(MessageTopic.topic_name)
        .join(Message, Message.topic_id == MessageTopic.id)
        .filter(
            Message.tenant_id == current_user.tenant_id,
            Message.topic_id.isnot(None),
        )
        .distinct()
        .order_by(MessageTopic.topic_name.asc())
        .all()
    )

    return {
        "topics": [topic.topic_name for topic in topics]
    }

# ─────────────────────────────────────────────────────────────────────────────
# /chatbot/report/summary
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/report/summary")
def get_chatbot_report_summary(
    dateRange: str = Query("Last 30 Days"),
    topic: str | None = Query(None),
    language: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant_id = current_user.tenant_id
    window_start = _resolve_date_range(dateRange)

    # Turns per conversation, real, no Justin column needed.
    conv_turns_subq = (
        db.query(
            Message.conversation_id.label("conversation_id"),
            func.count(Message.id).label("turns"),
        )
        .filter(Message.tenant_id == tenant_id)
        .group_by(Message.conversation_id)
        .subquery()
    )

    query = (
        db.query(
            MessageTopic.id.label("topic_id"),
            MessageTopic.topic_name.label("topic_name"),
            func.count(func.distinct(Message.conversation_id)).label("conversations"),
            func.avg(conv_turns_subq.c.turns).label("avg_turns"),
        )
        .join(Message, Message.topic_id == MessageTopic.id)
        .join(conv_turns_subq, conv_turns_subq.c.conversation_id == Message.conversation_id)
        .filter(
            Message.tenant_id == tenant_id,
            Message.created_at >= window_start,
        )
    )

    if topic and topic != "All Topics":
        query = query.filter(MessageTopic.topic_name == topic)

    if language and language != "All Languages" and HAS_LANGUAGE:
        query = query.join(
            Conversation, Conversation.id == Message.conversation_id
        ).filter(Conversation.detected_language == language)

    rows = query.group_by(MessageTopic.id, MessageTopic.topic_name).all()

    total_conversations = sum(r.conversations for r in rows) or 1

    # Top subtopic per topic — real, via Message.subtopic_id, but gated
    # behind HAS_MESSAGE_SUBTOPIC in case message.py hasn't been redeployed
    # with the subtopic_id column yet.
    top_subtopic_map = {}
    if HAS_MESSAGE_SUBTOPIC:
        subtopic_agg_subq = (
            db.query(
                Message.topic_id.label("topic_id"),
                Message.subtopic_id.label("subtopic_id"),
                func.count(Message.id).label("cnt"),
            )
            .filter(
                Message.tenant_id == tenant_id,
                Message.subtopic_id.isnot(None),
                Message.created_at >= window_start,
            )
            .group_by(Message.topic_id, Message.subtopic_id)
            .subquery()
        )
        subtopic_ranked_subq = (
            db.query(
                subtopic_agg_subq.c.topic_id,
                subtopic_agg_subq.c.subtopic_id,
                func.row_number().over(
                    partition_by=subtopic_agg_subq.c.topic_id,
                    order_by=subtopic_agg_subq.c.cnt.desc(),
                ).label("rn"),
            )
            .subquery()
        )
        top_subtopic_rows = (
            db.query(subtopic_ranked_subq.c.topic_id, MessageSubTopic.subtopic_name)
            .join(MessageSubTopic, MessageSubTopic.id == subtopic_ranked_subq.c.subtopic_id)
            .filter(subtopic_ranked_subq.c.rn == 1)
            .all()
        )
        top_subtopic_map = {row.topic_id: row.subtopic_name for row in top_subtopic_rows}

    summary = []
    for r in rows:
        resolved_pct, escalated_pct = MOCK_TOPIC_ANALYTICS.get(
            r.topic_name, DEFAULT_TOPIC_ANALYTICS
        )

        if HAS_STATUS:
            resolved = db.query(func.count(func.distinct(Conversation.id))).filter(
                Conversation.tenant_id == tenant_id,
                Conversation.status == "resolved",
                Conversation.id.in_(
                    db.query(Message.conversation_id).filter(Message.topic_id == r.topic_id)
                ),
            ).scalar()
            escalated = db.query(func.count(func.distinct(Conversation.id))).filter(
                Conversation.tenant_id == tenant_id,
                Conversation.status == "escalated",
                Conversation.id.in_(
                    db.query(Message.conversation_id).filter(Message.topic_id == r.topic_id)
                ),
            ).scalar()
        else:
            resolved = round(r.conversations * resolved_pct)
            escalated = round(r.conversations * escalated_pct)

        top_subtopic = top_subtopic_map.get(r.topic_id, "—")

        summary.append({
            "topic": r.topic_name,
            "conversations": r.conversations,
            "resolved": resolved,
            "escalated": escalated,
            "avgTurns": round(float(r.avg_turns or 0), 1),
            "topSubtopic": top_subtopic,
            "sharePct": round((r.conversations / total_conversations) * 100, 1),
        })

    return summary


# ─────────────────────────────────────────────────────────────────────────────
# /chatbot/report/detailed
# ─────────────────────────────────────────────────────────────────────────────

SORT_COLUMNS = {
    "id": Conversation.id,
    "farmerId": Conversation.farmer_id,
    "title": Conversation.title,
    "startedAt": Conversation.started_at,
    "lastActive": Conversation.last_message_at,
}


@router.get("/report/detailed")
def get_chatbot_report_detailed(
    dateRange: str = Query("Last 30 Days"),
    topic: str | None = Query(None),
    language: str | None = Query(None),
    status: str | None = Query(None),
    farmer: str | None = Query(None),
    page: int = Query(1, ge=1),
    pageSize: int = Query(10, ge=1, le=200),
    sortCol: str = Query("id"),
    sortDir: str = Query("asc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant_id = current_user.tenant_id
    window_start = _resolve_date_range(dateRange)

    turns_subq = (
        db.query(
            Message.conversation_id.label("conversation_id"),
            func.count(Message.id).label("turns"),
        )
        .filter(Message.tenant_id == tenant_id)
        .group_by(Message.conversation_id)
        .subquery()
    )

    # Conversation-level topic = topic of its most recent message. Real,
    # doesn't need any Justin column — just a correlated subquery.
    if HAS_MESSAGE_SUBTOPIC:
        last_msg_topic_subq = (
            db.query(
                Message.conversation_id.label("conversation_id"),
                MessageTopic.topic_name.label("topic_name"),
                MessageSubTopic.subtopic_name.label("subtopic_name"),
                func.row_number().over(
                    partition_by=Message.conversation_id,
                    order_by=Message.created_at.desc(),
                ).label("rn"),
            )
            .join(MessageTopic, MessageTopic.id == Message.topic_id)
            .outerjoin(MessageSubTopic, MessageSubTopic.id == Message.subtopic_id)
            .filter(Message.tenant_id == tenant_id)
            .subquery()
        )
    else:
        # message.py not updated yet — same shape, subtopic_name just stays NULL.
        last_msg_topic_subq = (
            db.query(
                Message.conversation_id.label("conversation_id"),
                MessageTopic.topic_name.label("topic_name"),
                literal(None).label("subtopic_name"),
                func.row_number().over(
                    partition_by=Message.conversation_id,
                    order_by=Message.created_at.desc(),
                ).label("rn"),
            )
            .join(MessageTopic, MessageTopic.id == Message.topic_id)
            .filter(Message.tenant_id == tenant_id)
            .subquery()
        )

    query = (
        db.query(
            Conversation,
            turns_subq.c.turns,
            last_msg_topic_subq.c.topic_name,
            last_msg_topic_subq.c.subtopic_name,
        )
        .outerjoin(turns_subq, turns_subq.c.conversation_id == Conversation.id)
        .outerjoin(
            last_msg_topic_subq,
            (last_msg_topic_subq.c.conversation_id == Conversation.id)
            & (last_msg_topic_subq.c.rn == 1),
        )
        .filter(
            Conversation.tenant_id == tenant_id,
            Conversation.started_at >= window_start,
        )
    )

    if topic and topic != "All Topics":
        query = query.filter(last_msg_topic_subq.c.topic_name == topic)

    if language and language != "All Languages" and HAS_LANGUAGE:
        query = query.filter(Conversation.detected_language == language)

    if status and status != "All Statuses" and HAS_STATUS:
        query = query.filter(Conversation.status == status.lower())

    farmer_name_map = {}
    farmer_code_map = {}
    if farmer:
        if farmer.isdigit():
            query = query.filter(Conversation.farmer_id == int(farmer))
        elif HAS_FARMER_MODEL:
            matches = db.query(FarmerRegistration.id).filter(
                FarmerRegistration.tenant_id == tenant_id,
                or_(
                    FarmerRegistration.FirstName.ilike(f"%{farmer}%"),
                    FarmerRegistration.MiddleName.ilike(f"%{farmer}%"),
                    FarmerRegistration.Surname.ilike(f"%{farmer}%"),
                    FarmerRegistration.farmer_lookup_code.ilike(f"%{farmer}%"),
                ),
            ).all()
            match_ids = [m.id for m in matches]
            query = query.filter(Conversation.farmer_id.in_(match_ids))

    total_count = query.count()

    sort_column = SORT_COLUMNS.get(sortCol, Conversation.id)
    query = query.order_by(sort_column.asc() if sortDir == "asc" else sort_column.desc())

    rows = query.offset((page - 1) * pageSize).limit(pageSize).all()

    # Batch-fetch farmer names + lookup codes in one query.
    # full_name is a Python @property on FarmerRegistration (not a SQL column),
    # so we pull the raw name fields and build it the same way the model does.
    if HAS_FARMER_MODEL:
        farmer_ids = [c.farmer_id for c, _, _, _ in rows]
        if farmer_ids:
            for f in db.query(
                FarmerRegistration.id,
                FarmerRegistration.FirstName,
                FarmerRegistration.MiddleName,
                FarmerRegistration.Surname,
                FarmerRegistration.farmer_lookup_code,
            ).filter(
                FarmerRegistration.tenant_id == tenant_id,
                FarmerRegistration.id.in_(farmer_ids),
            ).all():
                full_name = " ".join(filter(None, [f.FirstName, f.MiddleName, f.Surname]))
                farmer_name_map[f.id] = full_name or f"Farmer #{f.id}"
                if f.farmer_lookup_code:
                    farmer_code_map[f.id] = f.farmer_lookup_code

    detailed = []
    for conv, turns, topic_name, subtopic_name in rows:
        if HAS_LANGUAGE:
            lang = conv.detected_language
        else:
            lang = MOCK_LANGUAGES[conv.id % len(MOCK_LANGUAGES)]

        if HAS_STATUS:
            conv_status = conv.status.capitalize()
        else:
            conv_status = MOCK_STATUSES[conv.id % len(MOCK_STATUSES)]

        detailed.append({
            "id": conv.id,
            "farmerId": farmer_code_map.get(conv.farmer_id) or f"FRN-{conv.farmer_id:07d}",
            "farmerName": farmer_name_map.get(conv.farmer_id, f"Farmer #{conv.farmer_id}"),
            "title": conv.title,
            "topic": topic_name or "Uncategorised",
            "subtopic": subtopic_name or "—",
            "turns": turns or 0,
            "language": lang,
            "startedAt": (
    conv.started_at.strftime("%d %b %Y, %I:%M %p")
    if conv.started_at
    else None
),
            "lastActive": (
    conv.last_message_at.strftime("%d %b %Y, %I:%M %p")
    if conv.last_message_at
    else None
),
            "status": conv_status,
        })

    return {
        "data": detailed,
        "total": total_count,
        "page": page,
        "pageSize": pageSize,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Below: unchanged from the existing router (conversation-trends, query-types,
# conversations). Kept here so this file is a complete drop-in replacement.
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/conversation-trends")
def get_conversation_trends(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant_id = current_user.tenant_id
    now = datetime.utcnow()

    first_of_this_month = now.replace(day=1)
    months = []
    cursor = first_of_this_month
    for _ in range(6):
        months.append((cursor.year, cursor.month))
        cursor = (cursor - timedelta(days=1)).replace(day=1)
    months.reverse()

    window_start = datetime(months[0][0], months[0][1], 1)

    raw_counts = db.query(
        func.extract("year", Conversation.started_at).label("yr"),
        func.extract("month", Conversation.started_at).label("mo"),
        func.count(Conversation.id).label("count"),
    ).filter(
        Conversation.tenant_id == tenant_id,
        Conversation.started_at >= window_start,
    ).group_by("yr", "mo").all()

    counts_by_month = {(int(row.yr), int(row.mo)): row.count for row in raw_counts}

    labels = [datetime(yr, mo, 1).strftime("%b %Y") for yr, mo in months]
    values = [counts_by_month.get((yr, mo), 0) for yr, mo in months]

    return {"labels": labels, "values": values}


@router.get("/query-types")
def get_query_types(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(5, ge=1, le=20),
):
    tenant_id = current_user.tenant_id

    results = db.query(
        MessageTopic.topic_name.label("label"),
        func.count(Message.id).label("count"),
    ).join(
        MessageTopic, Message.topic_id == MessageTopic.id
    ).filter(
        Message.tenant_id == tenant_id,
        Message.topic_id.isnot(None),
    ).group_by(
        MessageTopic.id, MessageTopic.topic_name
    ).order_by(
        func.count(Message.id).desc()
    ).limit(limit).all()

    return {"queryTypes": [{"label": row.label, "count": row.count} for row in results]}


@router.get("/conversations")
def get_recent_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    region: str | None = Query(None, description="Filter by farmer location, if available on FarmerRegistration"),
    search: str | None = Query(None, description="Search by conversation title"),
    limit: int = Query(20, ge=1, le=100),
):
    tenant_id = current_user.tenant_id

    query = db.query(
        Conversation.id,
        Conversation.title,
        Conversation.farmer_id,
        Conversation.started_at,
        Conversation.last_message_at,
        func.count(Message.id).label("message_count"),
    ).outerjoin(
        Message, Message.conversation_id == Conversation.id
    ).filter(
        Conversation.tenant_id == tenant_id
    )

    if search:
        query = query.filter(Conversation.title.ilike(f"%{search}%"))

    query = query.group_by(
        Conversation.id,
        Conversation.title,
        Conversation.farmer_id,
        Conversation.started_at,
        Conversation.last_message_at,
    ).order_by(
        Conversation.last_message_at.desc()
    ).limit(limit)

    results = query.all()

    return {
        "conversations": [
            {
                "id": row.id,
                "title": row.title,
                "farmerId": row.farmer_id,
                "messageCount": row.message_count,
                "startedAt": row.started_at,
                "lastMessageAt": row.last_message_at,
            }
            for row in results
        ]
    }