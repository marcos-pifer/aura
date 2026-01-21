
import logging
from functools import wraps


def get_logger(module_name, level=logging.INFO):
    logger = logging.getLogger(f"AURA")
    if not getattr(logger, "_singleton_initialized", False):
        handler = logging.StreamHandler()
        handler.setLevel(level)
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        logger.setLevel(level)
        # Avoid adding multiple handlers if logger is reused
        if not logger.handlers:
            logger.addHandler(handler)
        logger._singleton_initialized = True
    return logger

def set_log_level(logger, log_level_str: str):
    numeric_level = getattr(logging, log_level_str.strip().upper(), logging.INFO)
    if not isinstance(numeric_level, int):
        raise ValueError(f'Invalid log level: {log_level_str}')
    logger.setLevel(numeric_level)
    for handler in logger.handlers:
        handler.setLevel(numeric_level)

def log_wrapper(logger):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            class_name = args[0].__class__.__name__ if args and hasattr(args[0], '__class__') else ''
            logger.debug(f"called {class_name}.{func.__name__}")
            result = func(*args, **kwargs)
            return result
        return wrapper
    return decorator