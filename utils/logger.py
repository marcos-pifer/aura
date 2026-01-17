
import logging
from functools import wraps


def get_logger(module_name, level=logging.INFO):
    handler = logging.StreamHandler()
    handler.setLevel(level)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)

    logger = logging.getLogger(f"{module_name}")
    logger.setLevel(level)
    logger.addHandler(handler)
    return logger

def set_log_level(logger, log_level_str: str):
    numeric_level = getattr(logging, log_level_str.strip().upper(), None)
    if not isinstance(numeric_level, int):
        raise ValueError(f'Invalid log level: {log_level_str}')
    logger.setLevel(numeric_level)

def log_wrapper(logger):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            class_name = args[0].__class__.__name__ if args and hasattr(args[0], '__class__') else ''
            logger.info(f"called {class_name}.{func.__name__}")
            result = func(*args, **kwargs)
            return result
        return wrapper
    return decorator