import os
import re

# components/ui 디렉토리의 모든 파일을 src/components/ui로 복사
source_dir = 'components/ui'
target_dir = 'src/components/ui'

# target_dir이 없으면 생성
os.makedirs(target_dir, exist_ok=True)

# 모든 .tsx와 .ts 파일 처리
for filename in os.listdir(source_dir):
    if filename.endswith(('.tsx', '.ts')):
        source_path = os.path.join(source_dir, filename)
        target_path = os.path.join(target_dir, filename)
        
        # 파일 읽기
        with open(source_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # "use client" 제거
        content = re.sub(r'^["\']?use client["\']?\s*\n', '', content, flags=re.MULTILINE)
        
        # 파일 쓰기
        with open(target_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f'Copied: {filename}')

print('Done!')
