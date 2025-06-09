import requests
from flask import Flask, request, jsonify

app = Flask(__name__)

API_BASE = "https://taxref.mnhn.fr/api"
HEADERS = {"Accept": "application/hal+json;version=1"}


def get_taxon_id(scientific_name: str):
    """Retrieve the taxon id (cd_nom) for a given scientific name."""
    try:
        params = {"q": scientific_name}
        resp = requests.get(f"{API_BASE}/taxa/search", params=params, headers=HEADERS)
        resp.raise_for_status()
        data = resp.json()
        items = data.get("_embedded", [])
        if not items:
            return None
        return items[0]["taxon"]["id"]
    except Exception as exc:
        raise RuntimeError(f"Error fetching taxon id for {scientific_name}: {exc}") from exc


def get_taxon_statuses_columns(cd_nom: int):
    """Retrieve status information for a taxon as column values."""
    try:
        resp = requests.get(f"{API_BASE}/taxa/{cd_nom}/status/columns", headers=HEADERS)
        resp.raise_for_status()
        return resp.json()
    except Exception as exc:
        raise RuntimeError(f"Error fetching status columns for {cd_nom}: {exc}") from exc


def format_species_data(api_data: dict):
    """Convert raw API status data into a simplified dictionary."""
    mapping = {
        "worldRedList": "Liste_Rouge_Mondiale",
        "europeanRedList": "Liste_Rouge_Europe",
        "nationalRedList": "Liste_Rouge_Nationale",
        "localRedList": "Liste_Rouge_Régionale",
        "bonnConvention": "Convention_Bonn",
        "bernConvention": "Convention_Berne",
        "barcelonaConvention": "Convention_Barcelone",
        "osparConvention": "Convention_OSPAR",
        "hffDirective": "Directive_Habitat",
        "birdDirective": "Directive_Oiseaux",
        "nationalProtection": "Protection_Nationale",
        "regionalProtection": "Protection_Régionale",
    }
    formatted = {}
    for key, new_key in mapping.items():
        formatted[new_key] = api_data.get(key)
    return formatted


@app.route("/api/generer-tableau", methods=["POST"])
def generer_tableau():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    if isinstance(data, dict) and "scientific_names" in data:
        names = data["scientific_names"]
    else:
        names = data

    if not isinstance(names, list):
        return jsonify({"error": "Invalid data format"}), 400
    if len(names) == 0:
        return jsonify({"error": "Empty species list"}), 400

    results = []
    for name in names:
        try:
            taxon_id = get_taxon_id(name)
            if taxon_id is None:
                results.append({"scientific_name": name, "error": "not found"})
                continue
            raw_data = get_taxon_statuses_columns(taxon_id)
            formatted = format_species_data(raw_data)
            formatted["scientific_name"] = name
            formatted["taxon_id"] = taxon_id
            results.append(formatted)
        except Exception as exc:
            results.append({"scientific_name": name, "error": str(exc)})
    return jsonify(results)


if __name__ == "__main__":
    app.run(debug=True)
