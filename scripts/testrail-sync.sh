#!/bin/bash
# Script de sincronización de resultados Cypress con TestRail
# Uso: ./scripts/testrail-sync.sh <TESTRAIL_USER> <TESTRAIL_API_KEY>

set -e

TESTRAIL_HOST="https://vivigo.testrail.io"
TESTRAIL_USER="${1:?Error: Se requiere TESTRAIL_USER}"
TESTRAIL_API_KEY="${2:?Error: Se requiere TESTRAIL_API_KEY}"
PROJECT_ID=1
SUITE_ID=1

RESULTS_DIR="cypress/results"
RUN_NAME="ViviGo E2E Run $(date +'%Y-%m-%d %H:%M')"

echo "Creando TestRun en TestRail..."
RUN_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -u "${TESTRAIL_USER}:${TESTRAIL_API_KEY}" \
  -d "$(cat <<EOF
{
  "name": "${RUN_NAME}",
  "suite_id": ${SUITE_ID},
  "include_all": true
}
EOF
)" \
  "${TESTRAIL_HOST}/index.php?/api/v2/add_run/${PROJECT_ID}")

RUN_ID=$(echo "${RUN_RESPONSE}" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)

if [ -z "${RUN_ID}" ]; then
  echo "Error: No se pudo crear el TestRun"
  echo "${RUN_RESPONSE}"
  exit 1
fi

echo "TestRun creado con ID: ${RUN_ID}"

PROCESSED_CASES=0
for RESULT_FILE in "${RESULTS_DIR}"/*.xml; do
  if [ -f "${RESULT_FILE}" ]; then
    echo "Procesando: ${RESULT_FILE}"
    while IFS= read -r line; do
      CASE_ID=$(echo "${line}" | grep -oP 'C\d{4}' | head -1)
      STATUS=$(echo "${line}" | grep -oP 'status="\K[^"]+')
      
      if [ -n "${CASE_ID}" ] && [ -n "${STATUS}" ]; then
        CASE_NUM=${CASE_ID#C}
        
        case "${STATUS}" in
          passed) STATUS_ID=1 ;;
          failed) STATUS_ID=5 ;;
          skipped) STATUS_ID=4 ;;
          *) STATUS_ID=3 ;;
        esac
        
        curl -s -X POST \
          -H "Content-Type: application/json" \
          -u "${TESTRAIL_USER}:${TESTRAIL_API_KEY}" \
          -d "$(cat <<EOF
{
  "results": [
    {
      "case_id": ${CASE_NUM},
      "status_id": ${STATUS_ID}
    }
  ]
}
EOF
)" \
          "${TESTRAIL_HOST}/index.php?/api/v2/add_results_for_cases/${RUN_ID}" > /dev/null
        
        PROCESSED_CASES=$((PROCESSED_CASES + 1))
      fi
    done < <(grep -o '<testcase[^>]*>' "${RESULT_FILE}")
  fi
done

echo "Procesados ${PROCESSED_CASES} casos de prueba"
echo "TestRun ID ${RUN_ID} completado"
echo ""
echo "Ver resultados en: ${TESTRAIL_HOST}/index.php?/runs/view/${RUN_ID}"
