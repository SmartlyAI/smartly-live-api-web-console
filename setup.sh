# Build, push on registry and create smartlyai stack
docker-compose build && docker-compose push && env $(cat .env | grep ^[A-Z] | xargs) docker stack deploy --compose-file docker-compose.yml demo 