from rest_framework.response import Response


def success_response(data=None, message="Success", status_code=200):
    return Response(
        {
            "isV1": True,
            "success": True,
            "message": message,
            "data": data,
        },
        status=status_code,
    )


def error_response(message="Internal Server Error", errors=None, status_code=500):
    return Response(
        {
            "isV1": True,
            "success": False,
            "message": message,
            "errors": errors,
        },
        status=status_code,
    )
