up:
	docker-compose up -d

down:
	docker-compose down

nuke:
	docker-compose down --volumes
	