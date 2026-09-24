# app/ml_assets/

Poids figés (jamais réentraînés) utilisés en transfer learning par le
classifieur d'images (`app/services/ml_training.py::_image_feature_vector`).

## mobilenetv2-embed.onnx

Extrait de `mobilenetv2-7.onnx` (ONNX Model Zoo, https://github.com/onnx/models,
licence Apache 2.0 — export ONNX d'un MobileNetV2 entraîné sur ImageNet,
architecture d'origine Google/MXNet Gluon CV), en coupant le graphe juste
après la couche `GlobalAveragePool` (sortie `mobilenetv20_features_pool0_fwd`,
1280 dimensions) et avant la tête de classification à 1000 classes ImageNet
d'origine — ces 1000 classes ne servent à rien ici, seul l'embedding
pré-classification nous intéresse.

Régénéré via :

```python
from onnx.utils import extract_model
extract_model(
    "mobilenetv2-7.onnx",
    "mobilenetv2-embed.onnx",
    input_names=["data"],
    output_names=["mobilenetv20_features_pool0_fwd"],
)
```

Entrée attendue : `[1, 3, 224, 224]`, RGB, normalisée
`(pixel/255 - mean) / std` avec `mean=[0.485,0.456,0.406]`,
`std=[0.229,0.224,0.225]` (convention ImageNet standard).

Ces poids ne sont jamais mis à jour par l'entraînement — seul le classifieur
final (régression logistique) entraîné sur les embeddings qu'ils produisent
est réentraîné.
