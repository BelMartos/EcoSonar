const formatCompliance = require('./formatCompliance')
const metricsW3c = require('../../utils/metricsW3c.json')
class FormatW3cAnalysis {}

/**
 *
 * THE FOLLOWING FUNCTION ARE USED TO FORMAT W3C ANALYSIS ON PROJECT AND URL PAGES BEFORE RETURNING RESPONSE TO AN API REQUEST
 *
 */

/**
 *
 * @param {Object} deployments is an object containing every analysis for the project by url and date
 * @returns a formatted deployment grouped by date to be used in the graph
 */
FormatW3cAnalysis.prototype.w3cAnalysisFormattedDeployments = function (deployments) {
  let j = 0
  const formattedDeployments = []
  let formattedMetrics

  try {
    while (j < deployments.length) {
      // For each category of error we subtract a value from the score depending on how many of this error type are present
      formattedMetrics = {
        score: deployments[j].score,
        dateAnalysis: deployments[j].dateW3cAnalysis,
        w3cBestPractices: deployments[j].w3cBestPractices
      }

      formattedDeployments[j] = formattedMetrics

      j++
    }
    return this.formatDeploymentsForGraphs(formattedDeployments)
  } catch (error) {
    console.log(error)
    console.log('W3C - error during the formatting of project analysis')
  }
}

/**
 *
 * @param {Object} formattedDeployments
 * @returns the deployments grouped by date
 */
FormatW3cAnalysis.prototype.formatDeploymentsForGraphs = function (formattedDeployments) {
  const duplicatedDeployments = []
  let totalw3cPractices = []

  for (const i of formattedDeployments) {
    // We filter deployments to find the values with the same date
    const duplicatedValuesArray = formattedDeployments.filter((element) => compareFullDate(element.dateAnalysis, i.dateAnalysis))
    for (const value of duplicatedValuesArray) {
      if (value.w3cBestPractices !== undefined) {
        for (const practice of value.w3cBestPractices) {
          totalw3cPractices.push(practice)
        }
      }
    }

    totalw3cPractices = formatW3c(totalw3cPractices)
    const score = this.calculateScore(totalw3cPractices)
    duplicatedDeployments.push({ score, dateAnalysis: duplicatedValuesArray[0].dateAnalysis })
  }
  // Sanitizing duplicatedDeployments
  const finalDeployment = getUniqueListByDate(duplicatedDeployments, 'dateAnalysis')
  function getUniqueListByDate (arr, key) {
    return [...new Map(arr.map((item) => [item[key], item])).values()]
  }
  function compareFullDate (firstDate, secondDate) {
    return firstDate.getDate() === secondDate.getDate() && firstDate.getMonth() === secondDate.getMonth() && firstDate.getFullYear() === secondDate.getFullYear()
  }
  return finalDeployment
}

/**
 *
 * @param {*} latestW3cAnalysis the latest W3C analysis stored in the collection
 * @returns a formatted analysis to be merged in accessibility item
 */
FormatW3cAnalysis.prototype.w3cLastAnalysisFormatted = function (latestW3cAnalysis) {
  const w3c = { totalInfo: 0, totalWarning: 0, totalError: 0, totalFatalError: 0, score: 0 }
  let w3cMetricArray = []
  let score = 0
  let totalInfo = 0
  let totalWarning = 0
  let totalError = 0
  let totalFatalError = 0

  try {
    for (const report of latestW3cAnalysis) {
      for (const metric of report.w3cBestPractices) {
        w3cMetricArray.push(metric)
      }
    }

    w3cMetricArray = formatW3c(w3cMetricArray)
    score = this.calculateScore(w3cMetricArray)

    for (const practice of w3cMetricArray) {
      if (practice.type === 'info') totalInfo += 1
      if (practice.type === 'warning') totalWarning += 1
      if (practice.type === 'error') totalError += 1
      if (practice.type === 'fatal error') totalFatalError += 1
    }

    // Setting the returned object
    w3c.score = Math.round(score)
    w3c.grade = formatCompliance.getAccessibilityGrade(w3c.score)
    w3c.dateAnalysis = latestW3cAnalysis[0].dateW3cAnalysis
    w3c.totalWarning = totalWarning
    w3c.totalError = totalError
    w3c.totalFatalError = totalFatalError
    w3c.totalInfo = totalInfo
    return w3c
  } catch (error) {
    console.log(error)
    console.log('W3C - error during the formatting of project analysis')
  }
}

/**
 * @param {Array} an array of errors
 * @returns the score plus a value for each error type
 */
FormatW3cAnalysis.prototype.calculateScore = function (errorsList) {
  let ratio = 0
  let score = 0
  let j, regex
  let match = false
  for (const metric of metricsW3c) {
    j = 0
    regex = new RegExp(metric.errorMessage)
    while (j < errorsList.length && match === false) {
      if (regex.test(errorsList[j].auditName)) {
        match = true
      } else {
        j++
      }
    }
    if (!match) {
      score += metric.coefficient * metric.score
    }
    ratio += metric.coefficient * metric.score
    match = false
  }
  score = Math.trunc((score * 100) / ratio)
  return score
}

/**
 *
 * @param {*} a list of w3c errors
 * @returns  a list of w3c errors without duplicate error
 */
function formatW3c (errorsList) {
  const errorsListWithoutDuplicat = []
  let match = false
  let i
  try {
    for (const error of errorsList) {
      i = 0
      while (i < errorsListWithoutDuplicat.length && match === false) {
        if (error.auditName === errorsListWithoutDuplicat[i].auditName) {
          match = true
          for (const line of error.description) {
            if (line.lineToCorrect !== undefined) {
              errorsListWithoutDuplicat[i].description.concat(line)
            }
          }
        }
        i++
      }
      if (match === false) {
        errorsListWithoutDuplicat.push(error)
      } else {
        match = false
      }
    }
    return errorsListWithoutDuplicat
  } catch (err) {
    console.log('W3C - Error during the deletion of duplicate errors for w3c analysis')
  }
}
const formatW3cAnalysis = new FormatW3cAnalysis()
module.exports = formatW3cAnalysis
