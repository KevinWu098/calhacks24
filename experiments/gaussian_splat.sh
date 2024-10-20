rm -rf data/input
rm -rf trained_model
mkdir -p data/input

ffmpeg -i flood.mp4 -vf fps=2 data/input/frame_%04d.png

xvfb-run python gaussian-splatting/convert.py -s data

xvfb-run python gaussian-splatting/train.py -s data -m trained_model --iterations 30000

tar -czvf trained_model.tar.gz trained_model

curl -F "file=@trained_model.tar.gz" -H "X-API-KEY: " https://file.io
