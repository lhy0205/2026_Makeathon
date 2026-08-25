from pydantic import BaseModel, ConfigDict


def to_camel(value: str) -> str:
    words = value.split("_")
    first_word = words[0]
    remaining_words = words[1:]
    camelized_words = []

    for word in remaining_words:
        camelized_words.append(word.capitalize())

    return first_word + "".join(camelized_words)


class ApiModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
