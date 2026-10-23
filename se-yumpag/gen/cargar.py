import ezdxf
from ezdxf import recover
import ezdxf.entities.mtext as _mt
_orig = _mt.load_columns_from_embedded_object
def _safe(dxf, obj):
    try: return _orig(dxf, obj)
    except Exception: return None
_mt.load_columns_from_embedded_object = _safe
def abrir(p):
    doc, aud = recover.readfile(p)
    return doc
