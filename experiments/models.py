from pydantic import BaseModel

class LoggerModel(BaseModel):
    environment: str


class ServerModel(BaseModel):
    host: str
    port: int

class DetectionModel(BaseModel):
    model_name: str
    conf_threshold: float
    iou_threshold: float
    use_checkpoint: bool

class TrainingModel(BaseModel):
    model_name: str
    data_dir: str
    data_yaml: str
    epochs: int
    workers: int
    device: str
    checkpoints_dir: str
    checkpoint_name: str

class Model(BaseModel):
    mode: str
    logger: LoggerModel
    server: ServerModel
    detection_model: DetectionModel
    training: TrainingModel