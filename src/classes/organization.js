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


            // Return the organization instance with parsed data
            return this;
        } catch (error) {
            console.error('Error parsing XML:', error);
            throw error;
        }
    }
}

module.exports = Organization;
