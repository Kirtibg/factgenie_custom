
This repository contains the code for the annotation interface used in the paper: **"Lehengas in Schools? Evaluating the Cultural Representation of AI-generated Stories in the Indian Context"**
in which we conducted a large-scale human evaluation of LLM-generated stories to assess the prevalence of cultural misrepresentations. This interface enabled participants to highlight spans in the generated story, tag the relevant category of misrepresentation, and add comments to support their annotations.

The interface is a modified version of [factgenie](https://github.com/ufal/factgenie), tailored for annotating user-specific content, cloud-based data storage and retrieval, and enhanced span-level annotations with reasoning comments.


## Key Modifications from factgenie

1. **User Identification Page**  
   Added an initial login screen where each participant enters their unique UserID.

2. **Personalized Data Loading from GCP**  
   Upon login, the interface retrieves the user’s personalized annotation dataset (e.g., stories) from a Google Cloud Storage bucket.

3. **Enhanced Annotation Interface**  
   Each time a span is selected, a comment box appears, allowing annotators to select a span category and provide a comment or reasoning for the annotation. This supports richer qualitative feedback alongside traditional span tagging.

4. **Progress Saving**  
   Added save and resume functionality, using which users can save progress at any time. Annotations are stored and reloaded when the same UserID logs in again.


##  Installation

1. **Clone this repository**
   ```bash
   git clone https://github.com/Kirtibg/factgenie_custom.git
   cd custom-factgenie
   ```

2. **Install dependencies**
   ```bash
   pip install -e '.[dev,deploy]'
   ```

3. **Set up Google Cloud access**  

   The app uses `google.cloud.storage.Client()` to access GCP. You can authenticate using your credentials from `gcloud auth login`.

   Set your bucket name as an environment variable (or configure in the app):
   ```bash
   export GCS_USER_DATA_BUCKET="your-gcp-bucket-name"
   ```

4. **Start the web interface**
   ```
   factgenie run --host=127.0.0.1 --port 8081
   ```
5. **Access interface**

   To access the interface, open your browser and navigate to:
   ```
   http://localhost:8081/annotate/cultural-misrep
   ```

For more information on how to use other features, please refer to [factgenie](https://github.com/ufal/factgenie).



## Storing Data on Google Cloud Storage (GCP)

To store annotation data for each participant on GCP, use the following structure in your bucket:

```
users/<UserID>/<UserID>_generation_0.jsonl
```

- ```users/```: top-level folder for all participants.
- ```<UserID>```: folder named with the participant's unique ID.
- ```<UserID>_generation_0.jsonl```: file containing the participant's customized content.

Each line in the `.jsonl` file should be a JSON object with the following structure:

```json
{
  "participant": {
    "id": "123456"
  },
  "output": "<customized text>"
}
```

- Ensure every line in the `.jsonl` file is a valid JSON object.
- Place the file in the correct `UserID` folder so the annotation interface can retrieve it for that participant.




## Citation / Attribution

If you find this interface or the underlying methodology useful, please cite our work:

```
@article{bhagat2025tales,
  title={TALES: A Taxonomy and Analysis of Cultural Representations in LLM-generated Stories},
  author={Bhagat, Kirti and Bhatt, Shaily and Velagapudi, Athul and Vashistha, Aditya and Dave, Shachi and Pruthi, Danish},
  journal={arXiv preprint arXiv:2511.21322},
  year={2025}
}
```
Please also make sure to cite factgenie, which our interface is built upon:

```
@inproceedings{kasner2024factgenie,
    title = "factgenie: A Framework for Span-based Evaluation of Generated Texts",
    author = "Kasner, Zden{\v{e}}k  and
      Platek, Ondrej  and
      Schmidtova, Patricia  and
      Balloccu, Simone  and
      Dusek, Ondrej",
    editor = "Mahamood, Saad  and
      Minh, Nguyen Le  and
      Ippolito, Daphne",
    booktitle = "Proceedings of the 17th International Natural Language Generation Conference: System Demonstrations",
    year = "2024",
    address = "Tokyo, Japan",
    publisher = "Association for Computational Linguistics",
    url = "https://aclanthology.org/2024.inlg-demos.5",
    pages = "13--15",
}
```



## License

This project inherits the license of factgenie. Please refer to the [LICENSE](https://github.com/ufal/factgenie/blob/master/LICENSE) file in the original repository for details.


