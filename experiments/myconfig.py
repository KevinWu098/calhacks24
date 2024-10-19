import toml
import os
from models import Model

class Config:

    def __init__(self, root_config_path: str):

        self.obj_detector = Model(
            **toml.load(os.path.join(root_config_path, "config.toml"))
        )