from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth as auth_routes
from app import database
from app.models import users
from app.routes import reset
from app.routes import tenant
from dotenv import load_dotenv
from fastapi.staticfiles import StaticFiles
import os
from app.routes.farmers import router as farmers_router
from app.routes import document
from app.routes.users import router as users_router
from app.routes import mpesa 
from app.routes import analytics
from app.routes import chat_history
from app.routes import transactions
from app.routes import carbon
from app.routes import financials
from app.routes import disease
from app.routes import payments
from app.routes import system_codes
from app.routes import search 
from app.routes import yield_report 
from fastapi.openapi.utils import get_openapi

load_dotenv() 
app = FastAPI() 


import os
creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
if creds_path:
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = creds_path
  
else:
    print("[STARTUP] WARNING: GOOGLE_APPLICATION_CREDENTIALS not set!")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://164.92.206.164",        
        "http://164.92.206.164:8000",   # Backend (sometimes needed if same-origin redirect)
        "http://localhost:5173",        # Local dev (vite)
        "http://localhost:8000"        
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "AgriScanAI :)"}

@app.on_event("startup")
def startup():
    database.Base.metadata.create_all(bind=database.engine)
    from app import auth
    db = database.SessionLocal()

    super_admin_email = "superadmin@agriscanai.co.ke"
    existing_super = db.query(users.User).filter(users.User.email == super_admin_email).first()
    if not existing_super:
        super_admin_user = users.User(
            first_name="Super",
            last_name="Admin",
            email=super_admin_email,
            hashed_password=auth.hash_password("Agriscanai123!"),
            role="super_admin",
            is_approved=True,
            tenant_id=3
        )
        db.add(super_admin_user)
        db.commit()      
        db.refresh(super_admin_user)
        print("Super admin user created:", super_admin_email)

    # Regular Admin
    admin_email = "admin@agriscanai.co.ke"
    existing_admin = db.query(users.User).filter(users.User.email == admin_email).first()
    if not existing_admin:
        admin_user = users.User(
    first_name="Admin",
    last_name="User",
    email=admin_email,
    hashed_password=auth.hash_password("NewSecurePassword123"),
    role="admin",
    is_approved=True
)

        db.add(admin_user)
        print("Admin user created:", admin_email)

    db.commit()
    db.close()

@app.middleware("http")
async def attach_new_tokens(request: Request, call_next):
    response = await call_next(request)
    if hasattr(request.state, "new_access_token"):
        response.headers["x-access-token"] = request.state.new_access_token
        response.headers["x-refresh-token"] = request.state.new_refresh_token
    return response

# Include Routers
app.include_router(auth_routes.router, prefix="/auth", tags=["Auth"])
app.include_router(reset.router, prefix="/reset", tags=["Reset"])
app.include_router(tenant.router, prefix="/tenants", tags=["Tenants"])
app.include_router(document.router, prefix="/documents", tags=["Documents"])
app.include_router(farmers_router)
app.include_router(users_router)
app.include_router(mpesa.router)
app.include_router(analytics.router)  
app.include_router(chat_history.router)
app.include_router(transactions.router)
app.include_router(carbon.router)
app.include_router(financials.router)
app.include_router(disease.router)
app.include_router(payments.router)
app.include_router(system_codes.router)
app.include_router(search.router)
app.include_router(yield_report.router)
app.include_router(yield_report.yield_trends_router) 


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title="ApiChain API",
        version="1.0.0",
        description="API with JWT auth",
        routes=app.routes,
    )

    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT"
        }
    }

    for path in openapi_schema["paths"]:
        for method in openapi_schema["paths"][path]:
            openapi_schema["paths"][path][method]["security"] = [
                {"BearerAuth": []}
            ]

    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi