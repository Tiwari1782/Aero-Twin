"""
sanitize.py — Convert numpy types to native Python types for DB compatibility.

psycopg2 cannot serialize numpy scalar types (np.float64, np.int64, etc.).
This module provides a recursive sanitizer that converts all numpy types
in dicts, lists, and individual values to native Python equivalents.
"""

import numpy as np


def sanitize_for_db(value):
    """
    Recursively convert numpy scalar types to native Python types.

    Handles:
        - np.float64 / np.float32 → float
        - np.int64 / np.int32 → int
        - np.bool_ → bool
        - np.str_ → str
        - dict → recursively sanitize all values
        - list / tuple → recursively sanitize all elements

    Args:
        value: Any value that might contain numpy types.

    Returns:
        The same structure with all numpy scalars converted to Python natives.
    """
    if isinstance(value, dict):
        return {k: sanitize_for_db(v) for k, v in value.items()}

    if isinstance(value, (list, tuple)):
        sanitized = [sanitize_for_db(v) for v in value]
        return type(value)(sanitized)

    if isinstance(value, np.integer):
        return int(value)

    if isinstance(value, np.floating):
        return float(value)

    if isinstance(value, np.bool_):
        return bool(value)

    if isinstance(value, np.str_):
        return str(value)

    if isinstance(value, np.ndarray):
        return value.tolist()

    # Generic fallback for any remaining numpy scalar types
    if hasattr(value, 'item'):
        return value.item()

    return value
