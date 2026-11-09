# Как получить APK через GitHub

1. Создайте новый репозиторий на GitHub.
2. Скачайте готовый архив: откройте опубликованную игру и добавьте к адресу `/block-realms-source.zip` (например `https://ваш-адрес.zite.so/block-realms-source.zip`). Распакуйте и загрузите **всё содержимое** в репозиторий (вместе с папкой `.github`).
3. Откройте вкладку **Actions** → workflow **Build Android APK** → **Run workflow** (он также запускается сам при каждом push в `main`).
4. Через ~5–8 минут откройте завершённый запуск и скачайте артефакт **BlockRealms3D-apk** — внутри `app-debug.apk`.
5. Скиньте APK на телефон и установите (разрешите «Установку из неизвестных источников»).

Файлы:
- `.github/workflows/build-apk.yml` — сборка игры и упаковка в Android-приложение (Capacitor).
- `apps/3d-block-puzzle-premium/capacitor.config.json` — название и ID приложения (`com.blockrealms.puzzle3d`).

Для публикации в Google Play нужен подписанный release-APK/AAB — это можно добавить позже.
