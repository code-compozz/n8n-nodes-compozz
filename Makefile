
launch_n8n:
	docker compose up -d
	echo "N8N is running at http://localhost:5678"

restart_n8n:
	docker compose restart n8n
	echo "N8N is restarting at http://localhost:5678"

stop_n8n:
	docker compose down

build:
	npm run build
	rm -rf ./n8n_data/custom/n8n-nodes-compozz
	mkdir -p ./n8n_data/custom/n8n-nodes-compozz
	cp -r ./dist/nodes ./n8n_data/custom/n8n-nodes-compozz/.
	cp -r ./dist/credentials ./n8n_data/custom/n8n-nodes-compozz/.
	cp -r ./launch/package.json ./n8n_data/custom/n8n-nodes-compozz/.

%:
	@:
