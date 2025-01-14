// Static metadata text content for different appraisal types

const REGULAR_APPRAISAL_METADATA = {
  Introduction: `<p class="has-text-align-justify">
This appraisal report provides a comprehensive and impartial evaluation of your item (whether art, an antique, or a collectible), leveraging the appraiser's extensive expertise and knowledge of the relevant market. The information and insights presented in this assessment are based solely on the materials and data provided by the client.
</p>
<p class="has-text-align-justify">
Understanding the value of your piece is crucial for making informed decisions about its future. This report delivers a precise estimate of its fair market value, expressed in US dollars. The valuation takes into account current market trends as well as comparable transactions. Note that this document is not intended to facilitate a sale; it serves as a resource for personal reference and planning.
</p>
<p class="has-text-align-justify">
This appraisal strictly adheres to high professional standards, ensuring ethical and technical accuracy. The report can be used for insurance, estate planning, charitable contributions, and any other purpose that requires a reliable valuation of the item.
</p>`,

  ImageAnalysisText: `<p class="has-text-align-justify">
For this appraisal, we have employed an AI-based image analysis tool (e.g., Google Vision) to identify visual parallels and key characteristics in the provided photographs of the item. The process began by submitting a detailed frontal image—offering the clearest overall view—to the AI service.
</p>
<p class="has-text-align-justify">
The primary goal is twofold: first, to detect items that resemble the piece under evaluation, shedding light on its potential style, period, or influences. Second, to determine the uniqueness of the piece, providing insight into how it fits within the broader market. If matches to well-documented items are discovered, it may indicate that the piece aligns with a specific movement or era; distinctive features, however, may point to its rarity or special attributes.
</p>`,

  SignatureText: `<p class="has-text-align-justify">
In this section, we explore the maker's or artist's background, drawing on biographical information and any known details about their career trajectory. We then examine the item's provenance—its ownership and usage history—which can greatly influence both authenticity and market value. 
</p>
<p class="has-text-align-justify">
Additionally, we investigate any maker's marks, signatures, hallmarks, or labels captured in your submitted images. This step may involve cross-referencing established databases containing recognized artists, workshops, or manufacturing details. By confirming these identifying factors, we can more accurately determine both the origin and potential value of the piece.
</p>`,

  ValuationText: `<p class="has-text-align-justify">
To establish a current market value, we look at recent sales data, auction results, or gallery listings involving comparable items. These transactions offer real-world evidence of what collectors and buyers are willing to pay, helping us form a fair estimate of the subject piece's value.
</p>
<p class="has-text-align-justify">
In the case of art, this may include recent auction outcomes or gallery sales within the last six months. For antiques or collectibles, we may examine specialized dealer listings, trade fairs, and collector databases. This ensures our evaluation remains aligned with present market conditions.
</p>`,

  AppraiserText: `<p class="has-text-align-justify">
A "mark-to-market" approach is instrumental in determining an item's current market value. The appraiser considers evolving market conditions, the piece's physical state, and the reputation of its maker or artist. This method provides a dynamic snapshot, reflecting the real-time worth of the property.
</p>
<p class="has-text-align-justify">
We further examine the maker or artist's prestige, based on their history of exhibitions, accolades, and notable achievements. This helps us project the potential trajectory of the item's future market value. Meanwhile, a thorough assessment of its condition is essential—signs of damage or repair can substantially affect how buyers perceive and value it.
</p>
<p class="has-text-align-justify">
In analyzing current market trends and recent transaction data, a mark-to-market appraisal furnishes a contemporary, fact-based figure. This benefits the seller or owner by providing a fair benchmark in potential transactions, insurance valuations, or estate settlements.
</p>`,

  LiabilityText: `<p class="has-text-align-justify">
Our appraisal services are carried out by professionals who meet stringent education and skill requirements, ensuring expertise in research, evaluation, and trending market data. Our aim is to present an objective value estimate for your item, whether for insurance, taxation, estate considerations, or a prospective sale.
</p>
<p class="has-text-align-justify">
We operate under a flat-fee model, avoiding any commission-based structures that could influence the final valuation. Consequently, we uphold fairness and impartiality in all our assessments. The resulting report is in line with the Uniform Standards of Professional Appraisal Practice (USPAP), confirming that it is both ethically sound and technically robust.
</p>`,

  SellingGuideText: `<p class="has-text-align-justify">
If you decide to sell your item, we offer a comprehensive selling guide available <a href="https://resources.appraisily.com/how-to-sell-your-artwork-a-comprehensive-guide/" target="_blank">here</a>. This resource outlines effective strategies for advertising, presenting, and pricing your piece in the current market.
</p>
<p class="has-text-align-justify">
We can also craft a tailored advertisement that highlights your item's unique attributes and value, helping you connect with potential buyers. These steps aim to facilitate a transparent and successful sale.
</p>`
};

const IRS_APPRAISAL_METADATA = {
  Introduction: `<p class="has-text-align-justify">
This appraisal report has been prepared for IRS tax deduction purposes, providing a thorough and impartial evaluation of the donated property. The appraisal complies with all IRS regulations and the Uniform Standards of Professional Appraisal Practice (USPAP).
</p>

<p class="has-text-align-justify"><strong>Description of the Property:</strong></p>
<p class="has-text-align-justify">
The item is a fine example of its kind, created using high-quality materials and exhibiting exceptional craftsmanship. It is in excellent condition, with minimal signs of wear or aging.
</p>

<p class="has-text-align-justify"><strong>Effective Date of Valuation:</strong> 
The date of this report serves as the effective date of valuation.
</p>`,

  ValuationText: `<p class="has-text-align-justify"><strong>Method of Valuation:</strong></p>
<p class="has-text-align-justify">
The fair market value has been determined using the <strong>Sales Comparison Approach</strong>, in accordance with IRS regulations and the Uniform Standards of Professional Appraisal Practice (USPAP). This method involves analyzing recent sales of comparable items to establish an appropriate value for the subject piece.
</p>

<p class="has-text-align-justify"><strong>Fair Market Value:</strong></p>
<p class="has-text-align-justify">
Based on a thorough analysis of the property—considering factors such as maker or artist reputation, provenance, condition, rarity, and current market trends—its fair market value has been determined in accordance with IRS guidelines. This valuation represents the estimated price at which the property would change hands between a willing buyer and a willing seller, neither being under any compulsion to buy or sell, and both having reasonable knowledge of relevant facts.
</p>`,

  SellingGuideText: `<p class="has-text-align-justify"><strong>Risk Assessment and Recommendations:</strong></p>
<p class="has-text-align-justify">
While the primary purpose of this appraisal is to comply with IRS requirements for tax deductions, we have also identified potential factors that may affect the property's ongoing care and safety. This includes considerations such as proper storage conditions, security measures, climate control, and handling practices. Implementing these recommendations can help preserve the property's condition, thereby maintaining its fair market value and ensuring compliance with the documentation standards required by the IRS.
</p>`,

  AppraiserText: `<p class="has-text-align-justify"><strong>Appraiser's Information:</strong></p>
<p class="has-text-align-justify">
Name: Andrés Gómez<br>
Qualifications: BSc, MSc, Accredited Appraiser with over a decade of experience in valuation.
</p>

<p class="has-text-align-justify"><strong>Statement of Appraiser Independence:</strong></p>
<p class="has-text-align-justify">
I affirm that my compensation is not contingent upon the appraised value of the property. I have no present or prospective interest in the property and have performed this appraisal in an unbiased manner.
</p>`,

  LiabilityText: `<p class="has-text-align-justify"><strong>Terms of Agreement:</strong></p>
<p class="has-text-align-justify">
There are no restrictions, agreements, or understandings regarding the use, sale, or disposition of the property that would affect its valuation.
</p>

<p class="has-text-align-justify"><strong>Compliance with USPAP and IRS Regulations:</strong></p>
<p class="has-text-align-justify">
This appraisal has been prepared in compliance with the Uniform Standards of Professional Appraisal Practice (USPAP) and IRS requirements under Section 170(f)(11) of the Internal Revenue Code.
</p>

<p class="has-text-align-justify"><strong>Limitation of Liability and Conflict of Interest:</strong></p>
<p class="has-text-align-justify">
The appraiser assumes no responsibility for matters legal in character. The appraisal is made subject to the condition that the appraiser is not required to give testimony or appear in court with reference to the property in question unless prior arrangements have been made.
</p>`,

  SignatureText: `<p class="has-text-align-justify"><strong>Authentication and Documentation:</strong></p>
<p class="has-text-align-justify">
An analysis of this item's authenticity has been conducted, including examination of provenance, maker or artist marks, signature analysis, and any accompanying certificates or documentation.
</p>`,

  ImageAnalysisText: `<p class="has-text-align-justify"><strong>Image Analysis:</strong></p>
<p class="has-text-align-justify">
High-resolution images of the property have been analyzed to assess its condition, materials, and other physical characteristics. This examination aids in identifying any factors that may affect the item's value, such as damage, repairs, or restorations. The images also serve as a visual record for appraisal documentation.
</p>`
};

// Export metadata for different appraisal types
module.exports = {
  regular: REGULAR_APPRAISAL_METADATA,
  irs: IRS_APPRAISAL_METADATA,
  insurance: {
    Introduction: `<p class="has-text-align-justify">
This insurance appraisal report provides a thorough and impartial evaluation of your item for insurance purposes. Our professional appraisal includes detailed documentation, an accurate replacement value, risk assessment, digital certification, priority processing, and expert consultation. This report complies with industry standards to ensure you have the necessary documentation to protect your valuable assets.
</p>`,

    ValuationText: `<p class="has-text-align-justify"><strong>Valuation Method:</strong></p>
<p class="has-text-align-justify">
The replacement value of this item has been determined based on current market data, including recent sales of comparable pieces, maker or artist reputation, and prevailing market conditions. This valuation reflects the cost to replace the item with one of similar quality and characteristics in the retail market, ensuring adequate coverage for insurance purposes.
</p>`,

    SellingGuideText: `<p class="has-text-align-justify"><strong>Risk Assessment:</strong></p>
<p class="has-text-align-justify">
As part of this appraisal, we have conducted a risk assessment to identify potential factors that may affect the safety and preservation of your item. This includes considerations of environmental conditions, security measures, and handling practices. Recommendations are provided to help mitigate risks and protect your investment.
</p>`,

    AppraiserText: `<p class="has-text-align-justify"><strong>Appraiser's Credentials:</strong></p>
<p class="has-text-align-justify">
Our appraisals are conducted by certified professionals with extensive experience in valuation for insurance purposes. We adhere to the highest ethical standards and maintain a deep understanding of the current market for art, antiques, and collectibles. This ensures our appraisal is accurate, reliable, and widely accepted by insurance companies.
</p>`,

    LiabilityText: `<p class="has-text-align-justify"><strong>Limitation of Liability and Conflict of Interest:</strong></p>
<p class="has-text-align-justify">
This appraisal has been prepared in accordance with the Uniform Standards of Professional Appraisal Practice (USPAP) and is intended solely for insurance purposes. The appraiser has no present or contemplated future interest in the appraised property and has no personal interest or bias with respect to the parties involved. The appraisal fee is not contingent upon any aspect of the report.
</p>`,

    SignatureText: `<p class="has-text-align-justify"><strong>Authentication and Documentation:</strong></p>
<p class="has-text-align-justify">
An analysis of any maker's mark, artist's signature, provenance, and accompanying documentation has been performed to authenticate the item. This process may include verifying signatures against known examples, examining hallmarks or stamps, and reviewing certificates of authenticity or previous appraisals to ensure the item's legitimacy.
</p>`,

    ImageAnalysisText: `<p class="has-text-align-justify"><strong>Image Analysis:</strong></p>
<p class="has-text-align-justify">
High-resolution images of the item have been analyzed to assess its condition, materials, and other physical characteristics. This thorough examination helps identify any issues that could affect the item's value, such as damage, repairs, or restoration. The images also serve as a visual record for insurance documentation.
</p>`
  }
  // Add other appraisal types here as needed
};