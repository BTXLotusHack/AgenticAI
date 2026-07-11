environment = "dev"
region      = "ap-southeast-1"

# Tasco Maps Valhalla map-matching endpoint (validated: Valhalla 3.7.0,
# accepts trace_attributes with no auth). See backend/README.md.
maps_trace_url = "https://tasco-maps.dnpwater.vn/route/trace_attributes"
maps_api_key   = ""

kinesis_on_demand = true
enable_push       = false
