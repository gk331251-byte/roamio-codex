from backend.auth_utils import get_rest_session


def test_rest_session_instantiation():
    session = get_rest_session()
    assert session is not None
    assert hasattr(session, 'get')
    assert hasattr(session, 'patch')

