environment = "prod"
region      = "ap-southeast-1"

maps_trace_url = "https://tasco-maps.dnpwater.vn/route/trace_attributes"
# Provide via TF_VAR_maps_api_key in CI rather than committing a secret.
maps_api_key = ""

kinesis_on_demand = true
enable_push       = true
