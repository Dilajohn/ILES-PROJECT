from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        return Response(
            {
                "success": False,
                "errors": response.data,
                "status_code": response.status_code,
            },
            status=response.status_code,
        )

    return Response(
        {
            "success": False,
            "errors": {"detail": "Internal server error"},
            "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
