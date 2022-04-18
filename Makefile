up:
	docker-compose up -d

lite:
	docker-compose up -d elasticsearch rollcall

down:
	docker-compose down

nuke:
	docker-compose down --volumes
