# install
## python
python version = 3.11.9

## virtual enviroment
`python3 -m venv .venv`

activate
`source .venv/bin/activate`

deactivate
`deactivate`

## CUDA, torch, tensorRT
``` python
pip install torch==2.3.1 torchvision==0.18.1 --index-url https://download.pytorch.org/whl/cu121

pip install --extra-index-url https://pypi.nvidia.com tensorrt==10.0.1

# 오류시
pip install --force-reinstall "torch==2.3.1+cu121" --index-url https://download.pytorch.org/whl/cu121
```

## CUDNN
```
# 1-1. 키링 패키지 설치 (레포 URL/키를 자동 설정)
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2404/x86_64/cuda-keyring_1.1-1_all.deb
sudo dpkg -i cuda-keyring_1.1-1_all.deb

# 1-2. 업데이트
sudo apt-get update

# cuda12 CUDNN 설치
sudo apt-get install -y libcudnn9-cuda-12 libcudnn9-dev-cuda-12
```

## requirements
`pip install -r requirements.txt`

## .env
DATASET_ROOT=/mnt/datasets
MODEL_ROOT=/mnt/models
BACKEND_API_KEY=super-secret-token