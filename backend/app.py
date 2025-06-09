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
        # The API returns a _embedded object which contains a 'taxa' list
        taxa_list = data.get("_embedded", {}).get("taxa", [])
        if not taxa_list:
            return None
        # Assuming the first result is the most relevant
        return taxa_list[0].get("id")
    except requests.exceptions.RequestException as exc:
        # Re-raise as a more generic exception to be caught by the main route
        raise RuntimeError(f"API request failed for {scientific_name}: {exc}") from exc
    except (KeyError, IndexError) as exc:
        # Handle cases where the JSON structure is unexpected
        raise RuntimeError(f"Unexpected API response structure for {scientific_name}: {exc}") from exc


def get_taxon_statuses_columns(cd_nom: int):
    """Retrieve status information for a taxon as column values."""
    try:
        # Note: The correct endpoint for statuses is under /taxa/{id}/statuses, not /status/columns
        resp = requests.get(f"{API_BASE}/taxa/{cd_nom}/statuses", headers=HEADERS)
        resp.raise_for_status()
        data = resp.json()
        # The data is expected directly in the response for this endpoint
        if "_embedded" in data and "taxonStatuses" in data["_embedded"]:
             return data["_embedded"]["taxonStatuses"][0] # Assuming one set of statuses per taxon
        return data # Fallback to returning the raw data if structure differs
    except requests.exceptions.RequestException as exc:
        raise RuntimeError(f"API request failed for status columns of {cd_nom}: {exc}") from exc


def format_species_data(api_data: dict):
    """Convert raw API status data into a simplified dictionary."""
    # This mapping is based on the `/status/search/columns` endpoint example.
    # The actual keys from `/taxa/{cd_nom}/statuses` might differ and this function may need adjustment.
    # For now, we assume the keys are directly present in the api_data dictionary.
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
    # Directly access the taxon data which is at the root of the status object
    taxon_info = api_data.get("taxon", {})
    formatted["Nom scientifique"] = taxon_info.get("scientificName", "N/A")
    formatted["ID Taxon (cd_nom)"] = taxon_info.get("id")
    
    # Process statuses
    for key, new_key in mapping.items():
        formatted[new_key] = api_data.get(key)
    return formatted


@app.route("/api/generer-tableau", methods=["POST"])
def generer_tableau():
    json_data = request.get_json()
    if not json_data or "scientific_names" not in json_data:
        return jsonify({"error": "Requête invalide. Le corps JSON doit contenir une clé 'scientific_names' avec une liste de noms."}), 400

    names = json_data["scientific_names"]
    if not isinstance(names, list):
        return jsonify({"error": "Le champ 'scientific_names' doit être une liste."}), 400

    results = []
    for name in names:
        if not name.strip():
            continue
        try:
            taxon_id = get_taxon_id(name)
            if taxon_id is None:
                results.append({"Nom scientifique": name, "Erreur": "Taxon non trouvé"})
                continue
            
            # The endpoint to get all statuses for a taxon is /taxa/{id}/statuses
            # The endpoint /status/search/columns is for multiple taxons at once and returns a different structure.
            # We will use the line-based search which is more appropriate here.
            
            params = {'taxrefId': taxon_id, 'size': 100} # Fetch all statuses for the taxon
            resp = requests.get(f"{API_BASE}/status/search/lines", params=params, headers=HEADERS)
            resp.raise_for_status()
            status_data = resp.json().get("_embedded", {}).get("taxonStatuses", [])

            # Aggregate all statuses into a single object for the row
            aggregated_statuses = {"Nom scientifique": name, "ID Taxon (cd_nom)": taxon_id}
            for status in status_data:
                status_type_name = status.get("statusTypeName", "Statut inconnu")
                status_value = status.get("statusName", status.get("statusCode", "Oui"))
                # Avoid overwriting existing keys if multiple statuses of same type exist
                if status_type_name not in aggregated_statuses:
                    aggregated_statuses[status_type_name] = status_value
                else: # Append if key already exists
                    aggregated_statuses[status_type_name] += f" ; {status_value}"

            results.append(aggregated_statuses)

        except Exception as exc:
            results.append({"Nom scientifique": name, "Erreur": str(exc)})
            
    return jsonify(results)


if __name__ == "__main__":
    # Note: For production, use a proper WSGI server instead of app.run()
    app.run(debug=True, port=5000)
