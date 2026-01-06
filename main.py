import uvicorn

from configuration import get_app, bind_routes
from routes import routes


def main() -> None:
    '''
    Запускает сервер
    '''
    app = get_app()
    bind_routes(app, routes)

    uvicorn.run(app, host="0.0.0.0", port=8000)


if __name__ == "__main__":
    main()
