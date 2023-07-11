const xml2js = require('xml2js');

class Organization {
    constructor(xmlData) {
        this.xmlData = xmlData;
        this.cfmCode = null;
        this.opfCode = null;
        this.orgName = null;
        this.shortName = null;
        this.rnn = null;
        this.iinbin = null;
        this.bik = null;
        this.oked = null;
        this.registerDate = null;
        this.registerNumber = null;
        this.registerAgency = null;
        this.org_firstName = null;
        this.org_secondName = null;
        this.org_middleName = null;
        this.org_documentIdentity = null;
        this.org_seriesDocIdentity = null;
        this.org_numberDocIdentity = null;
        this.org_documentIssued = null;
        this.org_dateIssuance = null;
        this.postalIndex = null;
        this.areaCode = null;
        this.districtCode = null;
        this.street = null;
        this.house = null;
        this.office = null;
        this.persons = null;
    }

    async parseXml() {
        try {
            const parser = new xml2js.Parser();
            const parsedData = await parser.parseStringPromise(this.xmlData);
            const organisationData = parsedData.Data.Root[0].OrganisationData[0];

            this.cfmCode = organisationData.CfmCode[0];
            this.opfCode = organisationData.OpfCode[0] || null;
            this.orgName = organisationData.OrgName[0] || null;
            this.shortName = organisationData.ShortName[0] || null;
            this.rnn = organisationData.RNN[0] || null;
            this.iinbin = organisationData.IINBIN[0] || null;
            this.bik = organisationData.BIK[0] || null;
            this.oked = organisationData.OKED[0] || null;
            this.registerDate = organisationData.RegisterDate[0] || null;
            this.registerNumber = organisationData.RegisterNumber[0] || null;
            this.registerAgency = organisationData.RegisterAgency[0] || null;

            const additionalAcData = organisationData.AdditionalAcData[0];
            this.org_firstName = additionalAcData.FirstName[0] || null;
            this.org_secondName = additionalAcData.SecondName[0] || null;
            this.org_middleName = additionalAcData.MiddleName[0] || null;
            this.org_documentIdentity = additionalAcData.DocumentIdentity[0] || null;
            this.org_seriesDocIdentity = additionalAcData.SeriesDocIdentity[0] || null;
            this.org_numberDocIdentity = additionalAcData.NumberDocIdentity[0] || null;
            this.org_documentIssued = additionalAcData.DocumentIssued[0] || null;
            this.org_dateIssuance = additionalAcData.DateIssuance[0] || null;

            this.postalIndex = organisationData.PostalIndex[0] || null;
            this.areaCode = organisationData.Area[0]['$'].Code || null;
            this.districtCode = organisationData.District[0]['$'].Code || null;
            this.street = organisationData.Street[0] || null;
            this.house = organisationData.House[0] || null;
            this.office = organisationData.Office[0] || null;

            const personElements = organisationData.Persons[0].Person;
            this.persons = personElements.map(personElement => {
                const firstName = personElement.FirstName[0] || null;
                const secondName = personElement.SecondName[0] || null;
                const middleName = personElement.MiddleName[0] || null;
                const individualNumber = personElement.IndividualNumber[0] || null;
                const jobName = personElement.JobName[0] || null;
                const phone = personElement.Phone[0] || null;
                const email = personElement.Email[0] || null;
                const certificate = personElement.Certificate[0] || null;

                return {
                    firstName,
                    secondName,
                    middleName,
                    individualNumber,
                    jobName,
                    phone,
                    email,
                    certificate
                };
            }) || null;

            // Return the organization instance with parsed data
            return this;
        } catch (error) {
            console.error('Error parsing XML:', error);
            throw error;
        }
    }
}

module.exports = Organization;
